import { NextRequest, NextResponse } from "next/server";
import { requireAuth, safeJson } from "@/lib/auth-verify";
import { getSamples, addSample, getNextSlot } from "../store";
import { createPresignedUploadUrl } from "@/lib/s3";
import { sanitizeFileName, sanitizeLabel, isValidProvider } from "@/lib/sanitize";
import { MAX_SAMPLES } from "@/constants/dashboard";
import { createRateLimiter } from "@/lib/rate-limit";

const uploadLimiter = createRateLimiter({ windowMs: 60_000, max: 6 });

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { allowed, retryAfterMs } = uploadLimiter.check(auth.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many upload requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  const body = await safeJson<{ label: string; provider: string; fileName: string }>(req);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const samples = await getSamples(auth.userId);
  if (samples.length >= MAX_SAMPLES) {
    return NextResponse.json({ error: "Sample limit reached" }, { status: 400 });
  }

  const label = sanitizeLabel(body.label);
  if (!label) {
    return NextResponse.json({ error: "Invalid label" }, { status: 400 });
  }

  if (!isValidProvider(body.provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const fileName = sanitizeFileName(body.fileName);
  if (!fileName) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  const slot = await getNextSlot(auth.userId);
  if (slot === -1) {
    return NextResponse.json({ error: "No available sample slots" }, { status: 400 });
  }
  const shortId = auth.userId.replace(/-/g, "").slice(0, 8);
  const sampleId = `${shortId}_${slot}`;

  const { url: uploadUrl, s3Key } = await createPresignedUploadUrl(
    auth.userId,
    `${sampleId}.txt`,
  );

  const ogFileName = `${sampleId}.txt`;
  const finalFileName = body.provider === "23andme" ? ogFileName : `${sampleId}_23.txt`;

  await addSample(auth.userId, {
    id: sampleId,
    label,
    provider: body.provider,
    status: "uploading",
    uploadedAt: new Date().toISOString(),
    fileSize: 0,
    ogFileName,
    finalFileName,
    s3Key,
  });

  return NextResponse.json({ sampleId, uploadUrl, expiresIn: 900 });
}
