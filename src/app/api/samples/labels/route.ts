import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-verify";
import { isValidDataset } from "@/lib/sanitize";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET = process.env.S3_BUCKET_NAME || "ioa-reference-data";

const MAX_CACHE_ENTRIES = 100;
const CACHE_TTL_MS = 5 * 60 * 1000;
const labelCache = new Map<string, { labels: string[]; ts: number }>();

function cacheSet(key: string, labels: string[]) {
  // Evict oldest entries if cache is full
  if (labelCache.size >= MAX_CACHE_ENTRIES) {
    let oldestKey = "";
    let oldestTs = Infinity;
    labelCache.forEach((v, k) => {
      if (v.ts < oldestTs) { oldestTs = v.ts; oldestKey = k; }
    });
    if (oldestKey) labelCache.delete(oldestKey);
  }
  labelCache.set(key, { labels, ts: Date.now() });
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const dataset = req.nextUrl.searchParams.get("dataset");
  if (!dataset || !isValidDataset(dataset)) {
    return NextResponse.json({ error: "Invalid dataset" }, { status: 400 });
  }

  const cacheKey = `${auth.userId}:${dataset}`;
  const cached = labelCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    const response = NextResponse.json({ labels: cached.labels, count: cached.labels.length });
    response.headers.set("Cache-Control", "private, max-age=300");
    return response;
  }

  const famKey = `${auth.userId}/qpadm/datasets/${auth.userId}_${dataset}.fam`;

  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: famKey }));
    const body = await res.Body?.transformToString();
    if (!body) {
      return NextResponse.json({ error: "Dataset file not found" }, { status: 404 });
    }

    const labelsSet = new Set<string>();
    for (const line of body.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const firstCol = trimmed.split(/\s+/)[0];
      if (firstCol) labelsSet.add(firstCol);
    }

    const sorted = Array.from(labelsSet).sort();
    cacheSet(cacheKey, sorted);

    const response = NextResponse.json({ labels: sorted, count: sorted.length });
    response.headers.set("Cache-Control", "private, max-age=300");
    return response;
  } catch {
    return NextResponse.json({ error: "Dataset file not found" }, { status: 404 });
  }
}
