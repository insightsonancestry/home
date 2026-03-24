import { NextResponse } from "next/server";
import { serverRefreshTokens } from "@/lib/cognito-server";
import { getAuthTokens, setAuthCookies } from "@/lib/cookies";
import { decodeJwt } from "jose";
import { sanitizeAuthError } from "@/lib/validation";

export async function POST() {
  const { refreshToken, idToken } = await getAuthTokens();

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  // Extract username (sub) from the (possibly expired) id_token to compute SECRET_HASH
  let username: string;
  try {
    if (!idToken) {
      return NextResponse.json({ error: "No id token" }, { status: 401 });
    }
    const payload = decodeJwt(idToken);
    // Cognito uses sub as the internal username
    username = payload.sub as string;
    if (!username) throw new Error("Missing sub claim");
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const tokens = await serverRefreshTokens(refreshToken, username);

    await setAuthCookies({
      IdToken: tokens.IdToken,
      AccessToken: tokens.AccessToken,
      // Cognito doesn't return a new refresh token on refresh
      ExpiresIn: tokens.ExpiresIn,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return NextResponse.json({ error: sanitizeAuthError(msg) }, { status: 401 });
  }
}
