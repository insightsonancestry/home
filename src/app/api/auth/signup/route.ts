import { NextResponse } from "next/server";
import { serverSignUp } from "@/lib/cognito-server";
import { validateEmail, validatePassword, validateName, validateCountry, sanitize, sanitizeAuthError } from "@/lib/validation";
import { createRateLimiter, getIpFromRequest } from "@/lib/rate-limit";

// 3 signup attempts per minute per IP
const signupLimiter = createRateLimiter({ windowMs: 60_000, max: 3 });

export async function POST(request: Request) {
  const ip = getIpFromRequest(request);
  const { allowed, retryAfterMs } = signupLimiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  try {
    const body = await request.json();
    const { email, password, firstName, lastName, middleName, country } = body;

    const validationError =
      validateName(firstName, "First name") ||
      validateName(lastName, "Last name") ||
      validateCountry(country) ||
      validateEmail(email) ||
      validatePassword(password);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await serverSignUp({
      email,
      password,
      firstName: sanitize(firstName),
      lastName: sanitize(lastName),
      middleName: sanitize(middleName || ""),
      country: sanitize(country),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    return NextResponse.json({ error: sanitizeAuthError(msg) }, { status: 400 });
  }
}
