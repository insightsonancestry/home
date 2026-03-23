import { NextResponse } from "next/server";
import { serverSignOut } from "@/lib/cognito-server";
import { getAuthTokens, clearAuthCookies } from "@/lib/cookies";

export async function POST() {
  try {
    const { accessToken } = await getAuthTokens();
    if (accessToken) {
      await serverSignOut(accessToken).catch(() => {});
    }
  } finally {
    await clearAuthCookies();
  }
  return NextResponse.json({ success: true });
}
