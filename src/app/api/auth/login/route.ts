import { NextResponse } from "next/server";
import { serverSignIn } from "@/lib/cognito-server";
import { setAuthCookies } from "@/lib/cookies";
import { validateEmail, sanitizeAuthError } from "@/lib/validation";
import { decodeJwt } from "jose";
import { createRateLimiter, getIpFromRequest } from "@/lib/rate-limit";

// 5 login attempts per minute per IP
const loginLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

export async function POST(request: Request) {
  const ip = getIpFromRequest(request);
  const { allowed, retryAfterMs } = loginLimiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  try {
    const { email, password } = await request.json();

    const emailErr = validateEmail(email);
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });
    if (!password) return NextResponse.json({ error: "Password is required" }, { status: 400 });

    const tokens = await serverSignIn(email, password);

    await setAuthCookies({
      IdToken: tokens.IdToken!,
      AccessToken: tokens.AccessToken!,
      RefreshToken: tokens.RefreshToken!,
      ExpiresIn: tokens.ExpiresIn,
    });

    const payload = decodeJwt(tokens.IdToken!);

    return NextResponse.json({
      user: {
        email: payload.email as string,
        firstName: (payload.given_name as string) || "",
        lastName: (payload.family_name as string) || "",
        userId: payload.sub as string,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return NextResponse.json({ error: sanitizeAuthError(msg) }, { status: 401 });
  }
}
