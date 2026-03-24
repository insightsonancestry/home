import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET = process.env.S3_BUCKET_NAME || "ioa-reference-data";

const REF_FAM_KEYS = [
  "v62_1240k/v62.0_1240k_public.fam",
  "v62_HO/v62.0_HO_public.fam",
];

let cachedLabels: Set<string> | null = null;
let cacheTs = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

async function parseFamLabels(key: string): Promise<string[]> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = await res.Body?.transformToString();
  if (!body) return [];
  const labels = new Set<string>();
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const firstCol = trimmed.split(/\s+/)[0];
    if (firstCol) labels.add(firstCol);
  }
  return Array.from(labels);
}

export async function getReferenceLabels(): Promise<Set<string>> {
  if (cachedLabels && Date.now() - cacheTs < CACHE_TTL_MS) {
    return cachedLabels;
  }

  const all = new Set<string>();
  for (const key of REF_FAM_KEYS) {
    const labels = await parseFamLabels(key);
    for (const l of labels) all.add(l);
  }

  cachedLabels = all;
  cacheTs = Date.now();
  return all;
}
