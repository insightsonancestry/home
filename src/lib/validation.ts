const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[\p{L}\p{M}' -]{1,50}$/u;
const COUNTRY_RE = /^[\p{L}\p{M}() -]{2,60}$/u;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required";
  if (!EMAIL_RE.test(email)) return "Invalid email format";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/\d/.test(password)) return "Password must contain a number";
  if (password.length > 128) return "Password is too long";
  return null;
}

export function validateName(name: string, field: string): string | null {
  if (!name.trim()) return `${field} is required`;
  if (!NAME_RE.test(name.trim())) return `${field} contains invalid characters`;
  return null;
}

export function validateCountry(country: string): string | null {
  if (!country) return "Country is required";
  if (!COUNTRY_RE.test(country)) return "Invalid country";
  return null;
}

export function sanitize(input: string): string {
  return input.trim().replace(/[<>"'&]/g, "");
}

export function sanitizeAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("limit exceeded") || lower.includes("too many requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (lower.includes("code mismatch") || lower.includes("invalid verification")) {
    return "Incorrect verification code. Please try again.";
  }
  if (lower.includes("expired")) {
    return "Verification code has expired. Please request a new one.";
  }
  if (lower.includes("password") && lower.includes("policy")) {
    return "Password does not meet requirements (8+ chars, uppercase, lowercase, number).";
  }

  // All other errors get a generic message to prevent info leakage
  // This covers: user already exists, user not confirmed, incorrect credentials,
  // invalid parameter — none of which should reveal account state
  return "Unable to complete request. Please check your details and try again.";
}
