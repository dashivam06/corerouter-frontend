"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useRef, useState } from "react";
import { refreshAuthToken } from "@/lib/api";
import {
  clearAllAuthClientTokens,
  getAuthProfileStorage,
  getAuthTokenStorage,
  getJwtExpiryMs,
  getRefreshTokenCookie,
  setAuthProfileStorage,
  setAuthTokenStorage,
  setRefreshTokenCookie,
  userFromAccessToken,
} from "@/lib/auth";
import { useAuthStore } from "@/stores/auth-store";

function mergeUsers(
  baseUser: ReturnType<typeof userFromAccessToken>,
  fallbackUser = getAuthProfileStorage(),
  profile?: { fullName: string; email: string; profileImage: string | null }
) {
  const user = baseUser || fallbackUser;
  if (!user) return null;

  return {
    ...user,
    full_name: profile?.fullName?.trim() || user.full_name,
    email: profile?.email || user.email,
    profile_image: profile?.profileImage ?? user.profile_image,
    last_login: new Date().toISOString(),
  };
}

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
      const cachedProfile = getAuthProfileStorage();

      try {
        if (accessToken) {
          const tokenUser = userFromAccessToken(accessToken);
          const user = mergeUsers(tokenUser, cachedProfile);
          const expMs = getJwtExpiryMs(accessToken);
          if (user) {
            const remaining = expMs
              ? Math.floor((expMs - Date.now()) / 1000)
              : 3600;
            if (remaining > 0) {
              setAuthProfileStorage(user);
              setSession(user, {
                accessToken,
                refreshToken: refreshToken || "",
                expiresIn: remaining,
              });

              if (!canceled) {
                setAuthBootstrapped(true);
              }
              return;
            }
          }
        }

        if (refreshToken) {
          const nextTokens = await refreshAuthToken(refreshToken);
          const tokenUser = userFromAccessToken(nextTokens.accessToken);
          const user = mergeUsers(tokenUser, cachedProfile, nextTokens.profile);
          if (user && !canceled) {
            setAuthTokenStorage(nextTokens.accessToken);
            setRefreshTokenCookie(nextTokens.refreshToken);
            setAuthProfileStorage(user);
            setSession(user, nextTokens);
            setUser(user);

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
  const user = useAuthStore((s) => s.user);
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
          const tokenUser = userFromAccessToken(nextTokens.accessToken);
          const nextUser = mergeUsers(tokenUser, user ?? getAuthProfileStorage(), nextTokens.profile);
          if (!nextUser) throw new Error("Unable to restore user from auth state");
          setAuthTokenStorage(nextTokens.accessToken);
          setRefreshTokenCookie(nextTokens.refreshToken);
          setTokens(nextTokens);
          setAuthProfileStorage(nextUser);
          setUser(nextUser);
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
  }, [authBootstrapped, accessTokenExpiresAt, clearSession, setTokens, setUser, user]);

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
