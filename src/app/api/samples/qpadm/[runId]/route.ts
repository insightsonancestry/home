import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-verify";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getRunItem, failRunRecord } from "../run-tracker";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET = process.env.S3_BUCKET_NAME || "ioa-reference-data";

const RUN_ID_RE = /^[a-f0-9]{8}$/;
const MAX_RUN_AGE_MS = 10 * 60 * 1000; // 10 min

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

  const runItem = await getRunItem(auth.userId, runId).catch(() => null);
  if (!runItem) {
    return NextResponse.json({ status: "failed", error: "Run not found" });
  }

  // If Lambda already marked it as completed or failed, trust that
  if (runItem.status === "completed") {
    const outputKey = `${auth.userId}/qpadm/outputs/${runId}.txt`;
    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: outputKey }));
      const result = await res.Body?.transformToString();
      if (result) {
        return NextResponse.json({
          status: "completed",
          result,
          stage: runItem.stage,
          durationMs: runItem.durationMs,
        });
      }
    } catch {
      // S3 file not found despite completed status — return error, don't fall through
      return NextResponse.json({
        status: "failed",
        error: "Result temporarily unavailable. Please try again.",
        stage: runItem.stage,
        durationMs: runItem.durationMs,
      });
    }
  }

  if (runItem.status === "failed" || runItem.status === "cancelled") {
    return NextResponse.json({
      status: "failed",
      error: runItem.error || (runItem.status === "cancelled" ? "Run was cancelled" : "Run failed"),
      stage: runItem.stage,
      durationMs: runItem.durationMs,
    });
  }

  // Still running — check for timeout
  if (Date.now() - runItem.createdAt > MAX_RUN_AGE_MS) {
    // Persist the timeout to DynamoDB so it doesn't keep blocking run slots
    await failRunRecord(auth.userId, runId, "Run timed out").catch(() => {});
    return NextResponse.json({
      status: "failed",
      error: "Run timed out. Please try again.",
      stage: runItem.stage,
    });
  }

  return NextResponse.json({
    status: "running",
    stage: runItem.stage,
  });
}
