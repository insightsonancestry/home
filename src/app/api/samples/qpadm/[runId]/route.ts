import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-verify";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET = process.env.S3_BUCKET_NAME || "ioa-reference-data";

const RUN_ID_RE = /^[a-f0-9]{8}$/;

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

  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: outputKey }));
    const result = await res.Body?.transformToString();

    if (!result) {
      return NextResponse.json({ status: "running" });
    }

    return NextResponse.json({ status: "completed", result });
  } catch (err: unknown) {
    const code = (err as { name?: string }).name;
    if (code === "NoSuchKey" || code === "NotFound") {
      return NextResponse.json({ status: "running" });
    }
    return NextResponse.json({ status: "running" });
  }
}
