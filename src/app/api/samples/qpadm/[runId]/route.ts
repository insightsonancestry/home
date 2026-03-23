import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-verify";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { runSubmissions } from "../run-tracker";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET = process.env.S3_BUCKET_NAME || "ioa-reference-data";

const RUN_ID_RE = /^[a-f0-9]{8}$/;
const MAX_RUN_AGE_MS = 10 * 60 * 1000; // 10 min — matches Lambda timeout

export async function GET(
  _req: NextRequest,
  { params }: { params: { runId: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { runId } = params;
  if (!RUN_ID_RE.test(runId)) {
    return NextResponse.json({ error: "Invalid run ID" }, { status: 400 });
  }

  const outputKey = `${auth.userId}/qpadm/outputs/${runId}.txt`;

  // Check S3 for result
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: outputKey }));
    const result = await res.Body?.transformToString();

    if (result) {
      runSubmissions.delete(runId);
      return NextResponse.json({ status: "completed", result });
    }
  } catch {
    // File doesn't exist yet — fall through to timeout check
  }

  // If no result, check whether the run has exceeded the Lambda timeout
  const submittedAt = runSubmissions.get(runId);
  if (submittedAt && Date.now() - submittedAt > MAX_RUN_AGE_MS) {
    runSubmissions.delete(runId);
    return NextResponse.json({
      status: "failed",
      error: "Run timed out. The Lambda may have crashed or exceeded its time limit.",
    });
  }

  return NextResponse.json({ status: "running" });
}
