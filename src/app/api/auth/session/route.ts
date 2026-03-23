import { NextResponse } from "next/server";
import { getAuthTokens, clearAuthCookies } from "@/lib/cookies";
import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS_URI = `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
const jwks = createRemoteJWKSet(new URL(JWKS_URI));

export async function GET() {
  const { idToken } = await getAuthTokens();
  if (!idToken) {
    return NextResponse.json({ user: null });
  }

  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
    });

    return NextResponse.json({
      user: {
        email: payload.email as string,
        firstName: (payload.given_name as string) || "",
        lastName: (payload.family_name as string) || "",
        userId: payload.sub as string,
      },
    });
  } catch {
    await clearAuthCookies();
    return NextResponse.json({ user: null });
  }
}
