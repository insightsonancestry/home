import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-verify";
import { getRunHistory } from "../run-tracker";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const runs = await getRunHistory(auth.userId);
    return NextResponse.json({ runs });
  } catch {
    return NextResponse.json({ runs: [] });
  }
}
