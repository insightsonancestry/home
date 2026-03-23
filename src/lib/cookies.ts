import { cookies } from "next/headers";

const IS_PROD = process.env.NODE_ENV === "production";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax" as const,
  path: "/",
};

export async function setAuthCookies(tokens: {
  IdToken?: string;
  AccessToken?: string;
  RefreshToken?: string;
  ExpiresIn?: number;
}) {
  const jar = await cookies();
  const maxAge = tokens.ExpiresIn || 3600;

  if (tokens.IdToken) {
    jar.set("ioa_id_token", tokens.IdToken, { ...COOKIE_OPTIONS, maxAge });
  }
  if (tokens.AccessToken) {
    jar.set("ioa_access_token", tokens.AccessToken, { ...COOKIE_OPTIONS, maxAge });
  }
  if (tokens.RefreshToken) {
    jar.set("ioa_refresh_token", tokens.RefreshToken, { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 3600 });
  }
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete("ioa_id_token");
  jar.delete("ioa_access_token");
  jar.delete("ioa_refresh_token");
}

export async function getAuthTokens() {
  const jar = await cookies();
  return {
    idToken: jar.get("ioa_id_token")?.value || null,
    accessToken: jar.get("ioa_access_token")?.value || null,
    refreshToken: jar.get("ioa_refresh_token")?.value || null,
  };
}
