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

  return (result.Items || []).map((item) => ({
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

export async function getNextSlot(userId: string): Promise<number> {
  const samples = await getSamples(userId);
  const taken = new Set(samples.map((s) => {
    const parts = s.id.split("_");
    return parseInt(parts[parts.length - 1], 10);
  }));
  for (let i = 1; i <= 3; i++) {
    if (!taken.has(i)) return i;
  }
  return -1;
}
