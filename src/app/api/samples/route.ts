import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-verify";
import { getSamples } from "./store";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const samples = await getSamples(auth.userId);
  const sanitized = samples.map(({ s3Key, ogFileName, finalFileName, ...rest }) => rest);

  return NextResponse.json({ samples: sanitized, sampleCount: sanitized.length });
}
