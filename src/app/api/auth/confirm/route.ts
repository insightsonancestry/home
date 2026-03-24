import { NextResponse } from "next/server";
import { serverConfirmSignUp } from "@/lib/cognito-server";
import { sanitizeAuthError } from "@/lib/validation";
import { safeJson } from "@/lib/auth-verify";
import { createRateLimiter, getIpFromRequest } from "@/lib/rate-limit";

// 5 OTP attempts per minute per IP
const confirmIpLimiter = createRateLimiter({ name: "confirm", windowMs: 60_000, max: 5 });
// 10 total OTP attempts per email (across all IPs) per 15-minute window
const confirmEmailLimiter = createRateLimiter({ name: "confirm-email", windowMs: 900_000, max: 10 });

export async function POST(request: Request) {
  const ip = getIpFromRequest(request);
  const { allowed, retryAfterMs } = await confirmIpLimiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  try {
    const body = await safeJson<{ email: string; code: string }>(request);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { email, code } = body;

    if (!email || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Per-email rate limit
    const emailCheck = await confirmEmailLimiter.check(email.toLowerCase());
    if (!emailCheck.allowed) {
      return NextResponse.json(
        { error: "Too many attempts for this email. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(emailCheck.retryAfterMs / 1000)) } },
      );
    }

    await serverConfirmSignUp(email, code);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return NextResponse.json({ error: sanitizeAuthError(msg) }, { status: 400 });
  }
}
