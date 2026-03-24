import { NextResponse } from "next/server";
import { serverRefreshTokens } from "@/lib/cognito-server";
import { getAuthTokens, setAuthCookies } from "@/lib/cookies";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { sanitizeAuthError } from "@/lib/validation";
import { createRateLimiter, getIpFromRequest } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";

const refreshLimiter = createRateLimiter({ name: "refresh", windowMs: 60_000, max: 5 });

const JWKS_URI = `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
const ISSUER = `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URI));
  return jwks;
}

export async function POST(request: Request) {
  const ip = getIpFromRequest(request);
  const { allowed, retryAfterMs } = await refreshLimiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many refresh attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  const { refreshToken, idToken } = await getAuthTokens();

  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  // Verify JWT signature but allow expired tokens (we're refreshing because it expired)
  let username: string;
  try {
    if (!idToken) {
      return NextResponse.json({ error: "No id token" }, { status: 401 });
    }
    const { payload } = await jwtVerify(idToken, getJwks(), {
      issuer: ISSUER,
      audience: CLIENT_ID,
      clockTolerance: 7 * 24 * 60 * 60, // allow up to 7 days expired
    });
    if (payload.token_use !== "id") throw new Error("Invalid token type");
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
      // If token rotation is enabled, Cognito returns a new refresh token
      RefreshToken: tokens.RefreshToken,
      ExpiresIn: tokens.ExpiresIn,
    });

    auditLog("auth.refresh", username, undefined, ip);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return NextResponse.json({ error: sanitizeAuthError(msg) }, { status: 401 });
  }
}
