import type { MockUser } from "@/lib/mock-data";

const REFRESH_TOKEN_COOKIE_KEY = "refresh_token";
const AUTH_TOKEN_STORAGE_KEY = "auth_token";
const AUTH_PROFILE_STORAGE_KEY = "auth_profile";

type JwtClaims = {
  role?: string;
  email?: string;
  username?: string;
  sub?: string;
  iat?: number;
  exp?: number;
};

function isBrowser() {
  return typeof document !== "undefined";
}

export function getRefreshTokenCookie(): string | null {
  if (!isBrowser()) return null;
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${REFRESH_TOKEN_COOKIE_KEY}=`));
  if (!cookie) return null;
  const value = cookie.split("=")[1] ?? "";
  return value ? decodeURIComponent(value) : null;
}

export function setRefreshTokenCookie(refreshToken: string) {
  if (!isBrowser()) return;
  const encoded = encodeURIComponent(refreshToken);
  document.cookie = `${REFRESH_TOKEN_COOKIE_KEY}=${encoded}; Path=/; SameSite=Lax; Secure`;
}

export function clearRefreshTokenCookie() {
  if (!isBrowser()) return;
  document.cookie = `${REFRESH_TOKEN_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}

export function getAuthTokenStorage(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setAuthTokenStorage(accessToken: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, accessToken);
}

export function clearAuthTokenStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem("corerouter_access_token");
}

export function getAuthProfileStorage(): MockUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_PROFILE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MockUser;
  } catch {
    window.localStorage.removeItem(AUTH_PROFILE_STORAGE_KEY);
    return null;
  }
}

export function setAuthProfileStorage(user: MockUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_PROFILE_STORAGE_KEY, JSON.stringify(user));
}

export function clearAuthProfileStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_PROFILE_STORAGE_KEY);
}

export function clearAllAuthClientTokens() {
  clearRefreshTokenCookie();
  clearAuthTokenStorage();
  clearAuthProfileStorage();
}

export function decodeJwtClaims(token: string): JwtClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payloadJson = atob(payloadBase64);
    return JSON.parse(payloadJson) as JwtClaims;
  } catch {
    return null;
  }
}

export function getJwtExpiryMs(token: string): number | null {
  const claims = decodeJwtClaims(token);
  if (!claims?.exp || typeof claims.exp !== "number") return null;
  return claims.exp * 1000;
}

export function userFromAccessToken(token: string): MockUser | null {
  const claims = decodeJwtClaims(token);
  if (!claims?.email) return null;

  const role = claims.role === "ADMIN" ? "ADMIN" : "USER";
  const subId = Number.parseInt(claims.sub ?? "0", 10);
  return {
    user_id: Number.isFinite(subId) && subId > 0 ? subId : Date.now(),
    balance: 0,
    created_at: new Date((claims.iat ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    email: claims.email,
    email_subscribed: true,
    full_name: claims.username || claims.email,
    last_login: new Date().toISOString(),
    profile_image: null,
    role,
    status: "ACTIVE",
  };
}
