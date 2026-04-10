"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { getProfile, loginSendEmail, loginWithGitHub, loginWithPassword } from "@/lib/api";
import { setAuthTokenStorage, setRefreshTokenCookie } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth-store";

const surfaceLowest = "bg-[#0e0e10]";
const labelClass =
  "text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-montserrat ";
const GOOGLE_CLIENT_ID = "897351990833-qhbkkacr92qk2jal85i16419cccde5cv.apps.googleusercontent.com";
const GOOGLE_OAUTH_STATE_KEY = "google_oauth_state";

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function buildGoogleOAuthUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="#EA4335" d="M12 10.2v3.95h5.53c-.24 1.24-1.35 3.63-5.53 3.63-3.33 0-6.05-2.76-6.05-6.16S8.67 5.47 12 5.47c1.9 0 3.17.81 3.9 1.5l2.65-2.55C16.84 3.06 14.68 2 12 2 6.48 2 2 6.48 2 12s4.48 10 10 10c5.76 0 9.58-4.05 9.58-9.76 0-.66-.07-1.16-.15-1.64H12Z" />
      <path fill="#FBBC05" d="M3.66 7.16 6.7 9.38C7.52 7.36 9.58 5.47 12 5.47c1.9 0 3.17.81 3.9 1.5l2.65-2.55C16.84 3.06 14.68 2 12 2 8.1 2 4.77 4.27 3.66 7.16Z" />
      <path fill="#34A853" d="M12 22c2.64 0 4.86-.87 6.48-2.38l-3.01-2.46c-.81.56-1.9.95-3.47.95-4.17 0-5.28-2.39-5.53-3.62H3.02C4.34 19.57 7.66 22 12 22Z" />
      <path fill="#4285F4" d="M21.58 12.24c0-.66-.07-1.16-.15-1.64H12v3.95h5.53c-.25 1.24-1.36 3.63-5.53 3.63v3.84c5.76 0 9.58-4.05 9.58-9.78Z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.54 2.87 8.39 6.84 9.75.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.38-3.37-1.38-.45-1.17-1.1-1.48-1.1-1.48-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.1.63-1.35-2.22-.26-4.56-1.13-4.56-5.02 0-1.11.38-2.02 1.01-2.73-.1-.26-.44-1.31.1-2.73 0 0 .82-.27 2.7 1.04a9.1 9.1 0 0 1 4.92 0c1.88-1.31 2.7-1.04 2.7-1.04.54 1.42.2 2.47.1 2.73.63.71 1.01 1.62 1.01 2.73 0 3.9-2.35 4.76-4.58 5.01.36.32.68.95.68 1.92 0 1.39-.01 2.51-.01 2.85 0 .26.18.58.69.48A10.3 10.3 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [showAuthNotice, setShowAuthNotice] = useState(() => {
    if (typeof window === "undefined") return false;
    const hasResetNotice = window.sessionStorage.getItem("auth_notice") === "password-reset-success";
    if (hasResetNotice) {
      window.sessionStorage.removeItem("auth_notice");
    }
    return hasResetNotice;
  });

  async function finalizeSession(
    user: NonNullable<Awaited<ReturnType<typeof loginWithPassword>>["user"]>,
    tokens: { accessToken: string; refreshToken: string; expiresIn: number }
  ) {
    setAuthTokenStorage(tokens.accessToken);
    setRefreshTokenCookie(tokens.refreshToken);

    try {
      const profile = await getProfile(tokens.accessToken, user);
      setSession(profile, tokens);
    } catch {
      setSession(user, tokens);
    }

    router.push("/dashboard");
  }

  useEffect(() => {
    if (cooldownSecs <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSecs((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSecs]);

  useEffect(() => {
    if (!showAuthNotice) return;
    const timer = window.setTimeout(() => {
      setShowAuthNotice(false);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [showAuthNotice]);

  async function onContinueEmail(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setError(null);
    const r = await loginSendEmail(email.trim());
    if (!r.ok) {
      setError(r.error ?? "Something went wrong.");
      return;
    }
    setStep("password");
  }

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (cooldownSecs > 0) return;
    setFieldErrors({});
    setError(null);
    setLoading(true);
    const r = await loginWithPassword(email.trim(), password);
    setLoading(false);
    if (r.error || !r.accessToken || !r.user) {
      setFieldErrors(r.fieldErrors ?? {});
      if (r.status === 429) {
        setCooldownSecs(30);
      }
      setError(r.error ?? "Invalid credentials.");
      return;
    }
    await finalizeSession(r.user, {
      accessToken: r.accessToken,
      refreshToken: r.refreshToken,
      expiresIn: r.expiresIn,
    });
  }

  function onGoogleSignIn() {
    setFieldErrors({});
    setError(null);
    setSocialLoading("google");

    const state =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, state);

    const redirectUri = `${window.location.origin}/auth/callback`;
    window.location.assign(buildGoogleOAuthUrl(redirectUri, state));
  }

  async function onGitHubSignIn() {
    setFieldErrors({});
    setError(null);
    setSocialLoading("github");

    let githubWindow: Window | null = null;
    try {
      githubWindow = window.open("", "_blank");
      const deviceResponse = await fetch("/api/auth/github/device", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "start" }),
      });

      if (!deviceResponse.ok) {
        throw new Error("Unable to start GitHub login.");
      }

      const deviceData: {
        device_code: string;
        user_code: string;
        verification_uri: string;
        interval?: number;
        expires_in?: number;
        error?: string;
      } = await deviceResponse.json();

      if (deviceData.error) {
        throw new Error(deviceData.error);
      }

      if (githubWindow) {
        githubWindow.location.href = deviceData.verification_uri;
      } else {
        window.open(deviceData.verification_uri, "_blank");
      }
      setError(`Open GitHub and enter code: ${deviceData.user_code}`);

      let intervalMs = Math.max((deviceData.interval ?? 5) * 1000, 1000);
      const expiresAt = Date.now() + (deviceData.expires_in ?? 900) * 1000;

      while (Date.now() < expiresAt) {
        await sleep(intervalMs);

        const tokenResponse = await fetch("/api/auth/github/device", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ type: "token", deviceCode: deviceData.device_code }),
        });

        const tokenData: {
          access_token?: string;
          error?: string;
          error_description?: string;
        } = await tokenResponse.json();

        if (!tokenResponse.ok && tokenData.error !== "authorization_pending" && tokenData.error !== "slow_down") {
          throw new Error(tokenData.error_description || tokenData.error || "GitHub login failed.");
        }

        if (tokenData.access_token) {
          const result = await loginWithGitHub(tokenData.access_token);
          setSocialLoading(null);

          if (result.error || !result.accessToken || !result.user) {
            setFieldErrors(result.fieldErrors ?? {});
            setError(result.error ?? "GitHub login failed.");
            return;
          }

          await finalizeSession(result.user, {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          });
          return;
        }

        if (tokenData.error === "authorization_pending") {
          continue;
        }

        if (tokenData.error === "slow_down") {
          intervalMs += 5000;
          continue;
        }

        throw new Error(tokenData.error_description || tokenData.error || "GitHub login failed.");
      }

      throw new Error("GitHub login timed out.");
    } catch (err) {
      githubWindow?.close();
      setSocialLoading(null);
      setError(err instanceof Error ? err.message : "GitHub login failed.");
    }
  }

  return (
    <div
      className={`min-h-screen ${surfaceLowest} flex flex-col items-center justify-center gap-12 px-6 py-12 text-[#e5e1e4] selection:bg-white selection:text-black font-montserrat `}
    >
      <div className="flex items-center justify-center">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/corerouter-logo.png"
            alt="CoreRouter"
            width={52}
            height={52}
            priority
            className="h-[3.25rem] w-[3.25rem] object-contain"
          />
          <span className="font-montserrat text-[22px] font-bold tracking-[0.08em] text-white">
            COREROUTER
          </span>
        </Link>
      </div>

      <div className="w-full max-w-[400px] space-y-8">
        {showAuthNotice ? (
          <div className="rounded-sm border border-zinc-200 bg-white px-3 py-2 text-center text-xs font-medium text-zinc-700">
            Password reset successful. Please sign in.
          </div>
        ) : null}

        {step === "email" ? (
          <section className="rounded-sm border border-zinc-200 bg-white p-8">
            <div className="mb-3">
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                Sign in
              </h2>
              <p className="mt-1 font-montserrat  text-sm text-zinc-500">
                Enter your email to access your infrastructure.
              </p>
            </div>
            <form className="space-y-4" onSubmit={onContinueEmail}>
              <div className="space-y-1.5">
                <label className={labelClass } htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-sm border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-950 outline-none transition-all placeholder:text-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 font-montserrat "
                />
                {fieldErrors.email ? (
                  <p className="text-sm text-red-600">{fieldErrors.email}</p>
                ) : null}
              </div>
              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-sm bg-zinc-950 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>
            <div className="my-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-300">
              {/* <span className="h-px flex-1 bg-zinc-200" />
              <span>or continue with</span>
              <span className="h-px flex-1 bg-zinc-200" /> */}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={socialLoading !== null}
                className="flex items-center justify-center gap-2 rounded-sm border border-zinc-200 bg-white px-3 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-50 disabled:opacity-60"
              >
                {socialLoading === "google" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <GoogleIcon className="size-4" />
                )}
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={onGitHubSignIn}
                disabled={socialLoading !== null}
                className="flex items-center justify-center gap-2 rounded-sm border border-zinc-200 bg-white px-3 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-50 disabled:opacity-60"
              >
                {socialLoading === "github" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <GitHubIcon className="size-4" />
                )}
                <span>GitHub</span>
              </button>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-6">
              <span className="text-xs text-zinc-400 font-montserrat ">No account?</span>
              <Link
                href="/register"
                className="text-xs font-semibold text-zinc-950 hover:underline font-montserrat "
              >
                Create one now
              </Link>
            </div>
          </section>
        ) : (
          <section className="rounded-sm border border-zinc-100 bg-white p-8">
            <div className="mb-8">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError(null);
                }}
                className="mb-4 flex items-center gap-1 text-zinc-400 transition-colors hover:text-zinc-950"
              >
                <ArrowLeft className="size-3.5" />
                <span className="text-xs font-medium">back</span>
              </button>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-zinc-500">{email}</p>
            </div>
            <form className="space-y-4" onSubmit={onSignIn}>
              <div className="space-y-1.5">
                <div className="flex items-end justify-between">
                  <label className={labelClass} htmlFor="password">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[10px] font-bold uppercase tracking-widest text-zinc-950 hover:underline"
                  >
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-sm border border-zinc-200 bg-zinc-50 px-4 py-3 pr-12 text-zinc-950 outline-none transition-all focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-zinc-950"
                    onClick={() => setShowPw(!showPw)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p className="text-sm text-red-600">{fieldErrors.password}</p>
                ) : null}
              </div>
              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={loading || cooldownSecs > 0}
                className="w-full rounded-sm bg-zinc-950 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="mx-auto size-4 animate-spin" />
                ) : (
                  cooldownSecs > 0 ? `Try again in ${cooldownSecs}s` : "Sign in"
                )}
              </button>
            </form>
          </section>
        )}
      </div>


    </div>
  );
}
