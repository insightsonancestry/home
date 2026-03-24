import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-verify";
import { getSamples, removeSample } from "../store";
import { deleteObject } from "@/lib/s3";
import { isValidSampleId } from "@/lib/sanitize";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const sampleId = params.id;
  if (!isValidSampleId(sampleId)) {
    return NextResponse.json({ error: "Invalid sample ID" }, { status: 400 });
  }

  const samples = await getSamples(auth.userId);
  const sample = samples.find((s) => s.id === sampleId);

  if (!sample) {
    return NextResponse.json({ error: "Sample not found" }, { status: 404 });
  }

  const rawPrefix = `${auth.userId}/rawfiles/`;
  const filesToDelete: string[] = [];

  if (sample.s3Key && !filesToDelete.includes(sample.s3Key)) filesToDelete.push(sample.s3Key);
  if (sample.ogFileName) {
    const key = `${rawPrefix}${sample.ogFileName}`;
    if (!filesToDelete.includes(key)) filesToDelete.push(key);
  }
  if (sample.finalFileName) {
    const key = `${rawPrefix}${sample.finalFileName}`;
    if (!filesToDelete.includes(key)) filesToDelete.push(key);
  }

  // Delete DB record first — orphaned S3 files are cheaper than orphaned records
  try {
    await removeSample(auth.userId, sampleId);
  } catch {
    return NextResponse.json({ error: "Failed to delete sample" }, { status: 500 });
  }

  for (const key of filesToDelete) {
    await deleteObject(key).catch(() => {});
  }

  const remaining = await getSamples(auth.userId);
  return NextResponse.json({ success: true, sampleCount: remaining.length });
}
