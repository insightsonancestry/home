import { NextRequest, NextResponse } from "next/server";
import { requireAuth, safeJson } from "@/lib/auth-verify";
import { isValidDataset, isValidPopulationLabel } from "@/lib/sanitize";
import { S3Client, GetObjectCommand, PutObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { auditLog } from "@/lib/audit";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const BUCKET = process.env.S3_BUCKET_NAME || "ioa-reference-data";

const REF_FAM_KEYS: Record<string, string> = {
  "1240K": "v62_1240k/v62.0_1240k_public.fam",
  "HO": "v62_HO/v62.0_HO_public.fam",
};

async function getUserFam(userId: string, dataset: string): Promise<string | null> {
  const key = `${userId}/qpadm/datasets/${userId}_${dataset}.fam`;
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    return await res.Body?.transformToString() || null;
  } catch {
    return null;
  }
}

async function saveUserFam(userId: string, dataset: string, content: string): Promise<void> {
  const key = `${userId}/qpadm/datasets/${userId}_${dataset}.fam`;
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: content, ContentType: "text/plain" }));
}

type EditBody =
  | { operation: "pool"; dataset: string; sampleIds: string[]; newLabel: string }
  | { operation: "rename"; dataset: string; oldLabel: string; newLabel: string }
  | { operation: "reset"; dataset: string };

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await safeJson<EditBody>(req);
  if (!body || !body.operation || !body.dataset) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!isValidDataset(body.dataset)) {
    return NextResponse.json({ error: "Invalid dataset" }, { status: 400 });
  }

  // === RESET ===
  if (body.operation === "reset") {
    const refKey = REF_FAM_KEYS[body.dataset];
    const destKey = `${auth.userId}/qpadm/datasets/${auth.userId}_${body.dataset}.fam`;
    try {
      await s3.send(new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${refKey}`,
        Key: destKey,
      }));
      auditLog("sample.confirm", auth.userId, { action: "reset_labels", dataset: body.dataset });
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ error: "Failed to reset dataset" }, { status: 500 });
    }
  }

  // === RENAME ===
  if (body.operation === "rename") {
    const { oldLabel, newLabel } = body;
    if (!oldLabel || !newLabel || !isValidPopulationLabel(oldLabel) || !isValidPopulationLabel(newLabel)) {
      return NextResponse.json({ error: "Invalid label" }, { status: 400 });
    }
    if (oldLabel === newLabel) {
      return NextResponse.json({ error: "Labels are the same" }, { status: 400 });
    }

    const fam = await getUserFam(auth.userId, body.dataset);
    if (!fam) return NextResponse.json({ error: "Dataset not found" }, { status: 404 });

    let changed = 0;
    const lines = fam.split("\n").map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      // .fam format: label<tab>sampleId col3 col4 col5 col6
      const tabIdx = trimmed.indexOf("\t");
      if (tabIdx === -1) return line;
      const label = trimmed.slice(0, tabIdx);
      if (label === oldLabel) {
        changed++;
        return newLabel + trimmed.slice(tabIdx);
      }
      return line;
    });

    if (changed === 0) {
      return NextResponse.json({ error: `Label "${oldLabel}" not found` }, { status: 404 });
    }

    await saveUserFam(auth.userId, body.dataset, lines.join("\n"));
    auditLog("sample.confirm", auth.userId, { action: "rename_label", dataset: body.dataset, oldLabel, newLabel, changed });
    return NextResponse.json({ success: true, changed });
  }

  // === POOL ===
  if (body.operation === "pool") {
    const { sampleIds, newLabel } = body;
    if (!newLabel || !isValidPopulationLabel(newLabel)) {
      return NextResponse.json({ error: "Invalid new label" }, { status: 400 });
    }
    if (!Array.isArray(sampleIds) || sampleIds.length === 0 || sampleIds.length > 500) {
      return NextResponse.json({ error: "Select 1-500 samples" }, { status: 400 });
    }
    for (const sid of sampleIds) {
      if (typeof sid !== "string" || !sid.trim()) {
        return NextResponse.json({ error: "Invalid sample ID" }, { status: 400 });
      }
    }

    const fam = await getUserFam(auth.userId, body.dataset);
    if (!fam) return NextResponse.json({ error: "Dataset not found" }, { status: 404 });

    const idSet = new Set(sampleIds);
    let changed = 0;
    const lines = fam.split("\n").map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      // .fam format: label<tab>sampleId col3 col4 col5 col6
      const tabIdx = trimmed.indexOf("\t");
      if (tabIdx === -1) return line;
      const rest = trimmed.slice(tabIdx + 1);
      const sampleId = rest.split(/\s+/)[0];
      if (idSet.has(sampleId)) {
        changed++;
        return newLabel + "\t" + rest;
      }
      return line;
    });

    if (changed === 0) {
      return NextResponse.json({ error: "No matching samples found" }, { status: 404 });
    }

    await saveUserFam(auth.userId, body.dataset, lines.join("\n"));
    auditLog("sample.confirm", auth.userId, { action: "pool_samples", dataset: body.dataset, newLabel, changed });
    return NextResponse.json({ success: true, changed });
  }

  return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
}
