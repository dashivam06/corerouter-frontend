"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getProfile, loginWithGoogleCode } from "@/lib/api";
import { setAuthTokenStorage, setRefreshTokenCookie } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth-store";

const GOOGLE_OAUTH_STATE_KEY = "google_oauth_state";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [message, setMessage] = useState("Completing Google sign in...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const googleError = searchParams.get("error");

      if (googleError) {
        setError(`Google returned an error: ${googleError}`);
        return;
      }

      if (!code) {
        setError("Missing authorization code.");
        return;
      }

      const expectedState = window.sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY);
      window.sessionStorage.removeItem(GOOGLE_OAUTH_STATE_KEY);

      if (!expectedState || !state || expectedState !== state) {
        setError("Google login state check failed. Please try again.");
        return;
      }

      const redirectUri = `${window.location.origin}/auth/callback`;
      const result = await loginWithGoogleCode(code, redirectUri);

      if (canceled) return;

      if (result.error || !result.accessToken || !result.refreshToken || !result.user) {
        setError(result.error ?? "Google login failed.");
        return;
      }

      setAuthTokenStorage(result.accessToken);
      setRefreshTokenCookie(result.refreshToken);

      try {
        const profile = await getProfile(result.accessToken, result.user);
        if (!canceled) {
          setSession(profile, {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          });
        }
      } catch {
        if (!canceled) {
          setSession(result.user, {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          });
        }
      }

      if (!canceled) {
        setMessage("Login successful. Redirecting to dashboard...");
        router.replace("/dashboard");
      }
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
