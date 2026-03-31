/** Placeholder for real JWT + httpOnly refresh cookie wiring */

export const ACCESS_TOKEN_KEY = "corerouter_access_token";

export function setMemoryAccessToken(_token: string | null) {
  /* In production: keep access token in memory only (Zustand), not localStorage */
}
