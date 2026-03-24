import { NextRequest, NextResponse } from "next/server";
import { requireAuth, safeJson } from "@/lib/auth-verify";
import { getSamples, removeSample, updateSampleStatus } from "../store";
import { headObject, deleteObject } from "@/lib/s3";
import { MAX_FILE_SIZE, isValidSampleId } from "@/lib/sanitize";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambda = new LambdaClient({ region: process.env.AWS_REGION || "us-east-1" });
const PROCESSING_FN = process.env.PROCESSING_FUNCTION_NAME || "ioa-processing";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await safeJson<{ sampleId: string }>(req);
  if (!body || !isValidSampleId(body.sampleId)) {
    return NextResponse.json({ error: "Invalid sample ID" }, { status: 400 });
  }

  const samples = await getSamples(auth.userId);
  const sample = samples.find((s) => s.id === body.sampleId);

  if (!sample) {
    return NextResponse.json({ error: "Sample not found" }, { status: 404 });
  }

  if (sample.status !== "uploading") {
    return NextResponse.json({ error: "Sample already processed" }, { status: 400 });
  }

  if (sample.s3Key) {
    const head = await headObject(sample.s3Key);
    if (!head) {
      await removeSample(auth.userId, body.sampleId);
      return NextResponse.json({ error: "File not found in storage. Upload may have failed." }, { status: 400 });
    }
    if (head.contentLength > MAX_FILE_SIZE) {
      await deleteObject(sample.s3Key);
      await removeSample(auth.userId, body.sampleId);
      return NextResponse.json({ error: "File exceeds maximum size limit" }, { status: 400 });
    }

    // Set status to "processing" — Lambda will update to "ready" when done
    await updateSampleStatus(auth.userId, body.sampleId, "processing", head.contentLength);
    sample.fileSize = head.contentLength;
  } else {
    await updateSampleStatus(auth.userId, body.sampleId, "processing");
  }

  // 23andMe files need no conversion — mark as ready directly
  if (sample.provider === "23andme") {
    await updateSampleStatus(auth.userId, body.sampleId, "ready", sample.fileSize);
  } else {
    // Trigger conversion Lambda for non-23andMe providers
    try {
      await lambda.send(new InvokeCommand({
        FunctionName: PROCESSING_FN,
        InvocationType: "Event",
        Payload: JSON.stringify({
          userId: auth.userId,
          sampleId: body.sampleId,
          provider: sample.provider,
          action: "convert",
        }),
      }));
    } catch (err) {
      console.error("Failed to trigger processing Lambda:", err);
      await updateSampleStatus(auth.userId, body.sampleId, "error").catch(() => {});
      return NextResponse.json({ error: "Failed to start processing" }, { status: 500 });
    }
  }

  return NextResponse.json({
    sample: {
      id: sample.id,
      label: sample.label,
      provider: sample.provider,
      status: sample.provider === "23andme" ? "ready" as const : "processing" as const,
      uploadedAt: sample.uploadedAt,
      fileSize: sample.fileSize,
    },
  });
}
