import { NextResponse } from "next/server";
import { serverConfirmSignUp } from "@/lib/cognito-server";
import { sanitizeAuthError } from "@/lib/validation";
import { createRateLimiter, getIpFromRequest } from "@/lib/rate-limit";

// 5 OTP attempts per minute per IP (brute force: 6-digit = 1M combos)
const confirmLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

export async function POST(request: Request) {
  const ip = getIpFromRequest(request);
  const { allowed, retryAfterMs } = confirmLimiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  try {
    const { email, code } = await request.json();

    if (!email || !code || code.length !== 6) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await serverConfirmSignUp(email, code);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return NextResponse.json({ error: sanitizeAuthError(msg) }, { status: 400 });
  }
}
