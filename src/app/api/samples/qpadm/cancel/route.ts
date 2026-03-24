import { NextRequest, NextResponse } from "next/server";
import { requireAuth, safeJson } from "@/lib/auth-verify";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }),
);
const TABLE = process.env.SAMPLES_TABLE || "ioa-samples";

const RUN_ID_RE = /^[a-f0-9]{8}$/;

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await safeJson<{ runId: string }>(req);
  if (!body?.runId || !RUN_ID_RE.test(body.runId)) {
    return NextResponse.json({ error: "Invalid run ID" }, { status: 400 });
  }

  try {
    await client.send(new UpdateCommand({
      TableName: TABLE,
      Key: { userId: auth.userId, sampleId: `run#${body.runId}` },
      UpdateExpression: "SET #s = :status",
      ConditionExpression: "#s = :running",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":status": "cancelled", ":running": "running" },
    }));
    return NextResponse.json({ status: "cancelled" });
  } catch (err: unknown) {
    const code = (err as { name?: string }).name;
    if (code === "ConditionalCheckFailedException") {
      return NextResponse.json({ error: "Run is not active" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to cancel run" }, { status: 500 });
  }
}
