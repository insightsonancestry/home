import { NextResponse } from "next/server";
import { serverResendCode } from "@/lib/cognito-server";
import { sanitizeAuthError } from "@/lib/validation";
import { safeJson } from "@/lib/auth-verify";
import { createRateLimiter, getIpFromRequest } from "@/lib/rate-limit";

// 2 resends per minute per IP (each triggers SES email)
const resendLimiter = createRateLimiter({ name: "resend", windowMs: 60_000, max: 2 });

export async function POST(request: Request) {
  const ip = getIpFromRequest(request);
  const { allowed, retryAfterMs } = await resendLimiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  try {
    const body = await safeJson<{ email: string }>(request);
    if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    const { email } = body;
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
    await serverResendCode(email);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return NextResponse.json({ error: sanitizeAuthError(msg) }, { status: 400 });
  }
}
