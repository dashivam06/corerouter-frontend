"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useRef, useState } from "react";
import { ApiRequestError, getProfile, refreshAuthToken } from "@/lib/api";
import {
  clearAllAuthClientTokens,
  getAuthTokenStorage,
  getJwtExpiryMs,
  getRefreshTokenCookie,
  setAuthTokenStorage,
  setRefreshTokenCookie,
  userFromAccessToken,
} from "@/lib/auth";
import { useAuthStore } from "@/stores/auth-store";

function AuthBootstrapper() {
  const authBootstrapped = useAuthStore((s) => s.authBootstrapped);
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const setAuthBootstrapped = useAuthStore((s) => s.setAuthBootstrapped);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    if (authBootstrapped) return;

    let canceled = false;

    const run = async () => {
      const refreshToken = getRefreshTokenCookie();
      const accessToken = getAuthTokenStorage();

      try {
        if (accessToken) {
          const user = userFromAccessToken(accessToken);
          const expMs = getJwtExpiryMs(accessToken);
          if (user) {
            const remaining = expMs
              ? Math.floor((expMs - Date.now()) / 1000)
              : 3600;
            if (remaining > 0) {
              setSession(user, {
                accessToken,
                refreshToken: refreshToken || "",
                expiresIn: remaining,
              });

              try {
                const profile = await getProfile(accessToken, user);
                if (!canceled) {
                  if (profile.status === "DELETED") {
                    clearSession();
                    clearAllAuthClientTokens();
                    window.location.assign("/login");
                    return;
                  }
                  setUser(profile);
                }
              } catch (error) {
                if (error instanceof ApiRequestError && error.status === 404) {
                  clearSession();
                  clearAllAuthClientTokens();
                  window.location.assign("/login");
                  return;
                }
              }

              if (!canceled) {
                setAuthBootstrapped(true);
              }
              return;
            }
          }
        }

        if (refreshToken) {
          const nextTokens = await refreshAuthToken(refreshToken);
          const user = userFromAccessToken(nextTokens.accessToken);
          if (user && !canceled) {
            setAuthTokenStorage(nextTokens.accessToken);
            setRefreshTokenCookie(nextTokens.refreshToken);
            setSession(user, nextTokens);

            try {
              const profile = await getProfile(nextTokens.accessToken, user);
              if (!canceled) {
                if (profile.status === "DELETED") {
                  clearSession();
                  clearAllAuthClientTokens();
                  window.location.assign("/login");
                  return;
                }
                setUser(profile);
              }
            } catch (error) {
              if (error instanceof ApiRequestError && error.status === 404) {
                clearSession();
                clearAllAuthClientTokens();
                window.location.assign("/login");
                return;
              }
            }

            if (!canceled) {
              setAuthBootstrapped(true);
            }
            return;
          }
        }

        if (!canceled) {
          setAuthBootstrapped(true);
        }
      } catch {
        if (!canceled) {
          clearSession();
          clearAllAuthClientTokens();
          setAuthBootstrapped(true);
        }
      }
    };

    void run();
    return () => {
      canceled = true;
    };
  }, [authBootstrapped, clearSession, setAuthBootstrapped, setSession, setUser]);

  return null;
}

function AuthSessionRefresher() {
  const accessTokenExpiresAt = useAuthStore((s) => s.accessTokenExpiresAt);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const clearSession = useAuthStore((s) => s.clearSession);
  const authBootstrapped = useAuthStore((s) => s.authBootstrapped);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!authBootstrapped) return;
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const refreshToken = getRefreshTokenCookie();
    if (!refreshToken || !accessTokenExpiresAt) return;

    let canceled = false;
    const scheduleIn = Math.max(accessTokenExpiresAt - Date.now() - 60_000, 0);

    const attemptRefresh = async (attempt: number) => {
      if (canceled) return;
      try {
        const nextTokens = await refreshAuthToken(refreshToken);
        if (!canceled) {
          const user = userFromAccessToken(nextTokens.accessToken);
          if (!user) throw new Error("Unable to decode user from access token");
          setAuthTokenStorage(nextTokens.accessToken);
          setRefreshTokenCookie(nextTokens.refreshToken);
          setTokens(nextTokens);
          try {
            const profile = await getProfile(nextTokens.accessToken, user);
            if (!canceled) {
              if (profile.status === "DELETED") {
                clearSession();
                clearAllAuthClientTokens();
                window.location.assign("/login");
                return;
              }
              setUser(profile);
            }
          } catch (error) {
            if (error instanceof ApiRequestError && error.status === 404) {
              clearSession();
              clearAllAuthClientTokens();
              window.location.assign("/login");
              return;
            }
            setUser(user);
          }
        }
      } catch (error) {
        const status =
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          typeof (error as { status?: unknown }).status === "number"
            ? ((error as { status: number }).status)
            : null;

        if (status === 429 && attempt < 4) {
          const waitMs = Math.min(1000 * 2 ** attempt, 30_000);
          timeoutRef.current = window.setTimeout(() => {
            void attemptRefresh(attempt + 1);
          }, waitMs);
          return;
        }

        clearSession();
        clearAllAuthClientTokens();
        if (window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
      }
    };

    timeoutRef.current = window.setTimeout(() => {
      void attemptRefresh(0);
    }, scheduleIn);

    return () => {
      canceled = true;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [authBootstrapped, accessTokenExpiresAt, setTokens, setUser, clearSession]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000 },
        },
      })
  );
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delay={200}>
        <AuthBootstrapper />
        <AuthSessionRefresher />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
