"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  getAuthProfileStorage,
  setAuthProfileStorage,
  setAuthTokenStorage,
  setRefreshTokenCookie,
  userFromAccessToken,
} from "@/lib/auth";
import { useAuthStore } from "@/stores/auth-store";

function normalizeQueryParam(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toLowerCase();
  if (normalized === "null" || normalized === "undefined") return null;
  return trimmed;
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [message, setMessage] = useState("Completing sign in...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      const status = searchParams.get("status");
      const provider = normalizeQueryParam(searchParams.get("provider"));
      const accessToken = normalizeQueryParam(searchParams.get("accessToken"));
      const refreshToken = normalizeQueryParam(searchParams.get("refreshToken"));
      const expiresInRaw = searchParams.get("expiresIn");
      const responseMessage = normalizeQueryParam(searchParams.get("message"));
      const profileFullName = normalizeQueryParam(searchParams.get("fullName"));
      const profileEmail = normalizeQueryParam(searchParams.get("email"));
      const profileImage = normalizeQueryParam(searchParams.get("profileImage"));

      if (status === "success") {
        if (!accessToken || !refreshToken) {
          setError("Missing authentication tokens in callback response.");
          window.setTimeout(() => {
            if (!canceled) {
              router.replace("/login");
            }
          }, 1500);
          return;
        }

        const parsedExpiresIn = Number.parseInt(expiresInRaw ?? "", 10);
        const expiresIn = Number.isFinite(parsedExpiresIn) && parsedExpiresIn > 0
          ? parsedExpiresIn
          : 3600;

        setAuthTokenStorage(accessToken);
        setRefreshTokenCookie(refreshToken);

        const tokenUser = userFromAccessToken(accessToken);
        const cachedUser = getAuthProfileStorage();

        const baseUser = tokenUser || cachedUser;
        const sessionUser = baseUser
          ? {
              ...baseUser,
              full_name: profileFullName?.trim() || baseUser.full_name,
              email: profileEmail || baseUser.email,
              profile_image: profileImage ?? baseUser.profile_image,
              last_login: new Date().toISOString(),
            }
          : null;

        if (sessionUser && !canceled) {
          setSession(sessionUser, {
            accessToken,
            refreshToken,
            expiresIn,
          });
          setAuthProfileStorage(sessionUser);
        } else if (!sessionUser && profileEmail && !canceled) {
          const fallbackUser = {
            user_id: Date.now(),
            balance: 0,
            created_at: new Date().toISOString(),
            email: profileEmail,
            email_subscribed: true,
            full_name: profileFullName?.trim() || profileEmail,
            last_login: new Date().toISOString(),
            profile_image: profileImage,
            role: "USER" as const,
            status: "ACTIVE" as const,
          };
          setSession(fallbackUser, {
            accessToken,
            refreshToken,
            expiresIn,
          });
          setAuthProfileStorage(fallbackUser);
        }

        if (!canceled) {
          const providerText = provider ? `${provider} ` : "";
          setMessage(`${providerText}login successful. Redirecting to dashboard...`);
          router.replace("/dashboard");
        }
        return;
      }

      const fallbackError = "Authentication failed. Please try signing in again.";
      setError(responseMessage || fallbackError);
      window.setTimeout(() => {
        if (!canceled) {
          router.replace("/login");
        }
      }, 1500);
    };

    void run();

    return () => {
      canceled = true;
    };
  }, [router, searchParams, setSession]);

  return (
    <div className="min-h-screen bg-[#0e0e10] px-6 py-16 text-white">
      <div className="mx-auto max-w-md rounded-sm border border-zinc-700 bg-zinc-900/70 p-6">
        {error ? (
          <div className="space-y-4">
            <p className="text-sm text-red-400">{error}</p>
            <Link href="/login" className="text-xs font-semibold text-white underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-zinc-200">
            <Loader2 className="size-4 animate-spin" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CallbackFallback() {
  return (
    <div className="min-h-screen bg-[#0e0e10] px-6 py-16 text-white">
      <div className="mx-auto max-w-md rounded-sm border border-zinc-700 bg-zinc-900/70 p-6">
        <div className="flex items-center gap-3 text-sm text-zinc-200">
          <Loader2 className="size-4 animate-spin" />
          <span>Loading authentication callback...</span>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
