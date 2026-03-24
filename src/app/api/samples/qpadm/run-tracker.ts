import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }),
);
const TABLE = process.env.SAMPLES_TABLE || "ioa-samples";

export interface RunConfig {
  dataset: string;
  sources: string[];
  references: string[];
  target: string;
  userTarget?: boolean;
  allsnps?: boolean;
}

export async function getActiveRunCount(userId: string): Promise<number> {
  const result = await client.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "userId = :uid AND begins_with(sampleId, :prefix)",
    ExpressionAttributeValues: { ":uid": userId, ":prefix": "run#" },
  }));
  return (result.Items || []).filter((item) => item.status === "running").length;
}

export async function registerRun(userId: string, runId: string, config: RunConfig): Promise<void> {
  const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // expire after 24h
  await client.send(new PutCommand({
    TableName: TABLE,
    Item: {
      userId,
      sampleId: `run#${runId}`,
      createdAt: Date.now(),
      status: "running",
      stage: "downloading_ref",
      ttl,
      ...config,
    },
  }));
}

export async function failRunRecord(userId: string, runId: string, error: string): Promise<void> {
  await client.send(new UpdateCommand({
    TableName: TABLE,
    Key: { userId, sampleId: `run#${runId}` },
    UpdateExpression: "SET #s = :status, #e = :err",
    ExpressionAttributeNames: { "#s": "status", "#e": "error" },
    ExpressionAttributeValues: { ":status": "failed", ":err": error.slice(0, 500) },
  }));
}

export interface ActiveRun {
  runId: string;
  createdAt: number;
  dataset: string;
  sources: string[];
  references: string[];
  target: string;
  userTarget?: boolean;
  stage?: string;
}

export async function getActiveRuns(userId: string): Promise<ActiveRun[]> {
  const result = await client.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "userId = :uid AND begins_with(sampleId, :prefix)",
    ExpressionAttributeValues: { ":uid": userId, ":prefix": "run#" },
  }));
  return (result.Items || [])
    .filter((item) => item.status === "running")
    .map((item) => ({
      runId: (item.sampleId as string).replace("run#", ""),
      createdAt: item.createdAt as number,
      dataset: (item.dataset as string) || "",
      sources: (item.sources as string[]) || [],
      references: (item.references as string[]) || [],
      target: (item.target as string) || "",
      userTarget: item.userTarget as boolean | undefined,
      stage: item.stage as string | undefined,
    }));
}

export interface RunItem {
  createdAt: number;
  status: string;
  stage?: string;
  durationMs?: number;
  error?: string;
}

export async function getRunItem(userId: string, runId: string): Promise<RunItem | null> {
  const result = await client.send(new GetCommand({
    TableName: TABLE,
    Key: { userId, sampleId: `run#${runId}` },
  }));
  if (!result.Item) return null;
  return {
    createdAt: result.Item.createdAt as number,
    status: (result.Item.status as string) || "running",
    stage: result.Item.stage as string | undefined,
    durationMs: result.Item.durationMs as number | undefined,
    error: result.Item.error as string | undefined,
  };
}
