import { jwtVerify, createRemoteJWKSet } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const JWKS_URI = `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
const ISSUER = `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URI));
  return jwks;
}

export async function verifyAuthToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: ISSUER,
      audience: CLIENT_ID,
    });

    if (payload.token_use !== "id") return null;

    const userId = payload.sub;
    if (!userId || typeof userId !== "string") return null;
    return userId;
  } catch {
    return null;
  }
}

/**
 * Extract and verify the authenticated userId from cookies.
 * Returns { userId } on success, or a 401 NextResponse on failure.
 */
export async function requireAuth(): Promise<
  { userId: string; error?: never } | { userId?: never; error: NextResponse }
> {
  const cookieStore = cookies();
  const token = cookieStore.get("ioa_id_token")?.value;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const userId = await verifyAuthToken(token);
  if (!userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId };
}

/**
 * Safely parse JSON from a Request body. Returns null on malformed input.
 */
export async function safeJson<T = unknown>(req: Request): Promise<T | null> {
  try {
    return await req.json() as T;
  } catch {
    return null;
  }
}
