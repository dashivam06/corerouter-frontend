"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  setAuthTokenStorage,
  setRefreshTokenCookie,
  userFromAccessToken,
} from "@/lib/auth";
import { useAuthStore } from "@/stores/auth-store";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [message, setMessage] = useState("Completing sign in...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    const run = () => {
      const status = searchParams.get("status");
      const provider = searchParams.get("provider");
      const accessToken = searchParams.get("accessToken");
      const refreshToken = searchParams.get("refreshToken");
      const expiresInRaw = searchParams.get("expiresIn");
      const responseMessage = searchParams.get("message");

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

        const user = userFromAccessToken(accessToken);
        if (user) {
          setSession(user, {
            accessToken,
            refreshToken,
            expiresIn,
          });
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

    run();

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
