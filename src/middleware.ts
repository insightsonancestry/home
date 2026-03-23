import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS_URI = `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
const ISSUER = `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URI));
  return jwks;
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://cognito-idp.us-east-1.amazonaws.com https://ioa-reference-data.s3.us-east-1.amazonaws.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );
  return response;
}

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "https://insightsonancestry.com",
  "https://www.insightsonancestry.com",
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF: reject mutation requests from unknown origins
  if (pathname.startsWith("/api/") && request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (pathname.startsWith("/dashboard")) {
    const idToken = request.cookies.get("ioa_id_token")?.value;

    if (!idToken) {
      return NextResponse.redirect(new URL("/signup", request.url));
    }

    try {
      const { payload } = await jwtVerify(idToken, getJwks(), {
        issuer: ISSUER,
        audience: CLIENT_ID,
      });

      if (payload.token_use !== "id") {
        throw new Error("Invalid token type");
      }
    } catch {
      const response = NextResponse.redirect(new URL("/signup", request.url));
      response.cookies.delete("ioa_id_token");
      response.cookies.delete("ioa_access_token");
      response.cookies.delete("ioa_refresh_token");
      return response;
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
