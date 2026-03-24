import { NextRequest, NextResponse } from "next/server";
import { requireAuth, safeJson } from "@/lib/auth-verify";
import { getSamples, claimNextSlot } from "../store";
import { createPresignedUploadUrl } from "@/lib/s3";
import { sanitizeFileName, sanitizeLabel, isValidProvider } from "@/lib/sanitize";
import { MAX_SAMPLES } from "@/constants/dashboard";
import { createRateLimiter } from "@/lib/rate-limit";
import { getReferenceLabels } from "@/lib/ref-labels";

const uploadLimiter = createRateLimiter({ name: "upload", windowMs: 60_000, max: 6 });

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { allowed, retryAfterMs } = await uploadLimiter.check(auth.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many upload requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  const body = await safeJson<{ label: string; provider: string; fileName: string; fileSize?: number }>(req);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
  if (body.fileSize !== undefined) {
    if (typeof body.fileSize !== "number" || body.fileSize <= 0 || body.fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "Invalid file size" }, { status: 400 });
    }
  }

  const samples = await getSamples(auth.userId);
  if (samples.length >= MAX_SAMPLES) {
    return NextResponse.json({ error: "Sample limit reached" }, { status: 400 });
  }

  const label = sanitizeLabel(body.label);
  if (!label) {
    return NextResponse.json({ error: "Invalid label" }, { status: 400 });
  }

  // Check label collision with reference dataset populations
  try {
    const refLabels = await getReferenceLabels();
    if (refLabels.has(label)) {
      return NextResponse.json(
        { error: "This label matches a population in the reference dataset. Please choose a different label." },
        { status: 400 },
      );
    }
  } catch {
    // If we can't load ref labels, allow the upload — don't block on a non-critical check
  }

  if (!isValidProvider(body.provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const fileName = sanitizeFileName(body.fileName);
  if (!fileName) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  // Atomically claim a slot — prevents race condition where two concurrent
  // uploads claim the same slot and overwrite each other's S3 file
  const shortId = auth.userId.replace(/-/g, "").slice(0, 8);
  const ogFileName = (slotSampleId: string) => `${slotSampleId}.txt`;
  const finalFileName = (slotSampleId: string) =>
    body.provider === "23andme" ? `${slotSampleId}.txt` : `${slotSampleId}_23.txt`;

  // We don't know the sampleId yet (depends on which slot is free), so we
  // generate presigned URL after claiming the slot
  const claimed = await claimNextSlot(auth.userId, {
    label,
    provider: body.provider,
    status: "uploading",
    uploadedAt: new Date().toISOString(),
    fileSize: 0,
    ogFileName: "", // placeholder, updated below
    finalFileName: "",
    s3Key: "",
  });

  if (!claimed) {
    return NextResponse.json({ error: "No available sample slots" }, { status: 400 });
  }

  const { sampleId } = claimed;
  const og = ogFileName(sampleId);
  const final = finalFileName(sampleId);

  const { url: uploadUrl, s3Key } = await createPresignedUploadUrl(auth.userId, og, body.fileSize);

  // Update the sample record with actual file names and S3 key
  const { updateSampleFiles } = await import("../store");
  await updateSampleFiles(auth.userId, sampleId, og, final, s3Key);

  return NextResponse.json({ sampleId, uploadUrl, expiresIn: 900 });
}
