"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { loginSendEmail, loginWithPassword } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const surfaceLowest = "bg-[#0e0e10]";
const labelClass =
  "text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-poppins";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onContinueEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const r = await loginSendEmail(email.trim());
    setLoading(false);
    if (!r.ok) {
      setError(r.error ?? "Something went wrong.");
      return;
    }
    setStep("password");
  }

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const r = await loginWithPassword(email.trim(), password);
    setLoading(false);
    if (r.error || !r.accessToken) {
      setError(r.error ?? "Invalid credentials.");
      return;
    }
    setSession(r.user, r.accessToken);
    router.push("/dashboard");
  }

  return (
    <div
      className={`min-h-screen ${surfaceLowest} flex flex-col items-center justify-center gap-12 px-6 py-12 text-[#e5e1e4] selection:bg-white selection:text-black `}
    >
      <div className="flex flex-col items-center gap-2">
        <Image
          src="/corerouter-logo.png"
          alt="CoreRouter"
          width={48}
          height={48}
          priority
        />
        <h1 className="text-2xl font-bold tracking-tighter text-white">
          COREROUTER
        </h1>
      </div>

      <div className="w-full max-w-[400px] space-y-8">
        {step === "email" ? (
          <section className="rounded-sm border border-zinc-200 bg-white p-8">
            <div className="mb-8">
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                Sign in
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Enter your email to access your infrastructure.
              </p>
            </div>
            <form className="space-y-4" onSubmit={onContinueEmail}>
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="email">
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
                  className="w-full rounded-sm border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-950 outline-none transition-all placeholder:text-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 font-poppins"
                />
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
            <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-6">
              <span className="text-xs text-zinc-400">No account?</span>
              <Link
                href="/register"
                className="text-xs font-semibold text-zinc-950 hover:underline"
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-950">
                    Forgot?
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-sm border border-zinc-200 bg-zinc-50 px-4 py-3 pr-12 text-zinc-950 outline-none transition-all focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 font-poppins"
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
              </div>
              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-sm bg-zinc-950 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="mx-auto size-4 animate-spin" />
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </section>
        )}
      </div>

      <footer className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
          Industrial Strength AI Routing · CoreRouter System v4.0
        </p>
      </footer>
    </div>
  );
}
