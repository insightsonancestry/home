import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-verify";
import { isValidDataset, isValidPopulationLabel } from "@/lib/sanitize";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET = process.env.S3_BUCKET_NAME || "ioa-reference-data";

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const famCache = new Map<string, { content: string; ts: number }>();

function cacheSet(key: string, content: string) {
  if (famCache.size >= MAX_CACHE_ENTRIES) {
    let oldestKey = "";
    let oldestTs = Infinity;
    famCache.forEach((v, k) => {
      if (v.ts < oldestTs) { oldestTs = v.ts; oldestKey = k; }
    });
    if (oldestKey) famCache.delete(oldestKey);
  }
  famCache.set(key, { content, ts: Date.now() });
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const dataset = req.nextUrl.searchParams.get("dataset");
  const label = req.nextUrl.searchParams.get("label");

  if (!dataset || !isValidDataset(dataset)) {
    return NextResponse.json({ error: "Invalid dataset" }, { status: 400 });
  }
  if (!label || !isValidPopulationLabel(label)) {
    return NextResponse.json({ error: "Invalid label" }, { status: 400 });
  }

  const cacheKey = `${auth.userId}:${dataset}`;
  let famContent: string;

  const cached = famCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    famContent = cached.content;
  } else {
    const famKey = `${auth.userId}/qpadm/datasets/${auth.userId}_${dataset}.fam`;
    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: famKey }));
      const body = await res.Body?.transformToString();
      if (!body) {
        return NextResponse.json({ error: "Dataset file not found" }, { status: 404 });
      }
      famContent = body;
      cacheSet(cacheKey, famContent);
    } catch {
      return NextResponse.json({ error: "Dataset file not found" }, { status: 404 });
    }
  }

  const samples: string[] = [];
  for (const line of famContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts[0] === label && parts[1]) {
      samples.push(parts[1]);
    }
  }

  const response = NextResponse.json({ samples });
  response.headers.set("Cache-Control", "private, max-age=300");
  return response;
}
