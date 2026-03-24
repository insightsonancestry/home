import { NextResponse } from "next/server";
import { serverSignIn } from "@/lib/cognito-server";
import { setAuthCookies } from "@/lib/cookies";
import { validateEmail, sanitizeAuthError } from "@/lib/validation";
import { safeJson } from "@/lib/auth-verify";
import { decodeJwt } from "jose";
import { createRateLimiter, getIpFromRequest } from "@/lib/rate-limit";
import { auditLog } from "@/lib/audit";

// 5 login attempts per minute per IP
const loginLimiter = createRateLimiter({ name: "login", windowMs: 60_000, max: 5 });

export async function POST(request: Request) {
  const ip = getIpFromRequest(request);
  const { allowed, retryAfterMs } = await loginLimiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  try {
    const body = await safeJson<{ email: string; password: string }>(request);
    if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    const { email, password } = body;

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
    auditLog("auth.login.success", payload.sub as string, { email }, ip);

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
    auditLog("auth.login.fail", null, undefined, ip);
    return NextResponse.json({ error: sanitizeAuthError(msg) }, { status: 401 });
  }
}
