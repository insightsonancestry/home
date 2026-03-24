import { NextResponse } from "next/server";
import { getAuthTokens, clearAuthCookies } from "@/lib/cookies";
import { verifyIdToken } from "@/lib/auth-verify";

export async function GET() {
  const { idToken } = await getAuthTokens();
  if (!idToken) {
    return NextResponse.json({ user: null });
  }

  const payload = await verifyIdToken(idToken);
  if (!payload) {
    await clearAuthCookies();
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      email: payload.email as string,
      firstName: (payload.given_name as string) || "",
      lastName: (payload.family_name as string) || "",
      userId: payload.sub as string,
    },
  });
}
