import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, DeleteCommand, UpdateCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import type { Sample } from "@/constants/dashboard";

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }),
);

const SAMPLES_TABLE = process.env.SAMPLES_TABLE || "ioa-samples";
const USERS_TABLE = process.env.USERS_TABLE || "ioa-users";

export async function getSamples(userId: string): Promise<Sample[]> {
  const result = await client.send(new QueryCommand({
    TableName: SAMPLES_TABLE,
    KeyConditionExpression: "userId = :uid",
    ExpressionAttributeValues: { ":uid": userId },
  }));

  return (result.Items || []).filter((item) => !String(item.sampleId).startsWith("run#")).map((item) => ({
    id: item.sampleId,
    label: item.label,
    provider: item.provider,
    status: item.status,
    uploadedAt: item.uploadedAt,
    fileSize: item.fileSize || 0,
    ogFileName: item.ogFileName,
    finalFileName: item.finalFileName,
    s3Key: item.s3Key,
  }));
}

export async function addSample(userId: string, sample: Sample): Promise<void> {
  await client.send(new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: SAMPLES_TABLE,
          Item: {
            userId,
            sampleId: sample.id,
            label: sample.label,
            provider: sample.provider,
            status: sample.status,
            uploadedAt: sample.uploadedAt,
            fileSize: sample.fileSize,
            ogFileName: sample.ogFileName,
            finalFileName: sample.finalFileName,
            s3Key: sample.s3Key,
          },
          ConditionExpression: "attribute_not_exists(sampleId)",
        },
      },
      {
        Update: {
          TableName: USERS_TABLE,
          Key: { userId },
          UpdateExpression: "ADD sampleCount :inc",
          ExpressionAttributeValues: { ":inc": 1 },
        },
      },
    ],
  }));
}

export async function removeSample(userId: string, sampleId: string): Promise<void> {
  await client.send(new TransactWriteCommand({
    TransactItems: [
      {
        Delete: {
          TableName: SAMPLES_TABLE,
          Key: { userId, sampleId },
          ConditionExpression: "attribute_exists(sampleId)",
        },
      },
      {
        Update: {
          TableName: USERS_TABLE,
          Key: { userId },
          UpdateExpression: "ADD sampleCount :dec",
          ExpressionAttributeValues: { ":dec": -1 },
        },
      },
    ],
  }));
}

export async function updateSampleStatus(
  userId: string,
  sampleId: string,
  status: string,
  fileSize?: number,
): Promise<void> {
  const updates: string[] = ["#s = :status"];
  const values: Record<string, unknown> = { ":status": status };
  const names: Record<string, string> = { "#s": "status" };

  if (fileSize !== undefined) {
    updates.push("fileSize = :fs");
    values[":fs"] = fileSize;
  }

  await client.send(new UpdateCommand({
    TableName: SAMPLES_TABLE,
    Key: { userId, sampleId },
    UpdateExpression: `SET ${updates.join(", ")}`,
    ExpressionAttributeValues: values,
    ExpressionAttributeNames: names,
  }));
}

export async function updateSampleFiles(
  userId: string,
  sampleId: string,
  ogFileName: string,
  finalFileName: string,
  s3Key: string,
): Promise<void> {
  await client.send(new UpdateCommand({
    TableName: SAMPLES_TABLE,
    Key: { userId, sampleId },
    UpdateExpression: "SET ogFileName = :og, finalFileName = :final, s3Key = :s3",
    ExpressionAttributeValues: {
      ":og": ogFileName,
      ":final": finalFileName,
      ":s3": s3Key,
    },
  }));
}

/**
 * Find and atomically claim the next available slot (1-3).
 * Uses DynamoDB conditional put to prevent two concurrent requests
 * from claiming the same slot. Retries on conflict.
 */
export async function claimNextSlot(
  userId: string,
  sampleData: Omit<Sample, "id">,
): Promise<{ sampleId: string; sample: Sample } | null> {
  const shortId = userId.replace(/-/g, "").slice(0, 8);
  const samples = await getSamples(userId);
  const taken = new Set(samples.map((s) => {
    const parts = s.id.split("_");
    return parseInt(parts[parts.length - 1], 10);
  }));

  for (let slot = 1; slot <= 3; slot++) {
    if (taken.has(slot)) continue;

    const sampleId = `${shortId}_${slot}`;
    const sample: Sample = { ...sampleData, id: sampleId };

    try {
      await addSample(userId, sample);
      return { sampleId, sample };
    } catch (err: unknown) {
      const code = (err as { name?: string }).name;
      // TransactionCanceledException means the condition failed (slot taken by concurrent request)
      if (code === "TransactionCanceledException") continue;
      throw err;
    }
  }

  return null;
}
