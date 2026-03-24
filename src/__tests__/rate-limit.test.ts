import { describe, it, expect } from "vitest";
import { getIpFromRequest } from "@/lib/rate-limit";

function mockRequest(headers: Record<string, string>): Request {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || null,
    },
  } as unknown as Request;
}

describe("getIpFromRequest", () => {
  it("prefers x-real-ip (Vercel trustworthy header)", () => {
    const req = mockRequest({
      "x-real-ip": "1.2.3.4",
      "x-forwarded-for": "9.9.9.9",
    });
    expect(getIpFromRequest(req)).toBe("1.2.3.4");
  });

  it("uses rightmost x-vercel-forwarded-for as fallback", () => {
    const req = mockRequest({
      "x-vercel-forwarded-for": "spoofed.ip, 5.6.7.8",
    });
    expect(getIpFromRequest(req)).toBe("5.6.7.8");
  });

  it("trims whitespace from IPs", () => {
    const req = mockRequest({
      "x-real-ip": "  1.2.3.4  ",
    });
    expect(getIpFromRequest(req)).toBe("1.2.3.4");
  });

  it("ignores x-forwarded-for (spoofable)", () => {
    const req = mockRequest({
      "x-forwarded-for": "spoofed.ip.1, spoofed.ip.2",
    });
    // Should NOT use x-forwarded-for
    expect(getIpFromRequest(req)).toBe("unknown");
  });

  it("returns 'unknown' when no headers present", () => {
    const req = mockRequest({});
    expect(getIpFromRequest(req)).toBe("unknown");
  });

  it("handles single IP in x-vercel-forwarded-for", () => {
    const req = mockRequest({
      "x-vercel-forwarded-for": "10.0.0.1",
    });
    expect(getIpFromRequest(req)).toBe("10.0.0.1");
  });
});
