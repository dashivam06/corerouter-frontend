"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  completeRegistration,
  registerSendOtp,
  verifyOtp,
} from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

type Step = "email" | "otp" | "profile";

const labelAuth =
  "text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-poppins";
const labelDark =
  "text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-poppins";
const otpBox =
  "h-14 w-12 rounded-sm border border-[#474747] bg-[#1c1b1d] text-center text-lg text-white outline-none focus:border-white font-poppins";

function StepDots({ step }: { step: Step }) {
  const idx = step === "email" ? 0 : step === "otp" ? 1 : 2;
  return (
    <div className="mb-10 flex items-center justify-center gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`size-1.5 rounded-full ${
            i <= idx ? "bg-white" : "bg-[#474747]"
          }`}
        />
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSecs, setResendSecs] = useState(0);

  useEffect(() => {
    if (resendSecs <= 0) return;
    const t = setInterval(() => setResendSecs((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendSecs]);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const r = await registerSendOtp(email.trim());
    setLoading(false);
    if (!r.ok) {
      setError(r.error ?? "Could not send code.");
      return;
    }
    setResendSecs(45);
    setStep("otp");
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    setError(null);
    setLoading(true);
    const r = await verifyOtp(email.trim(), code);
    setLoading(false);
    if (!r.ok) {
      setError(r.error ?? "Invalid code.");
      return;
    }
    setStep("profile");
  }

  async function onComplete(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);
    const r = await completeRegistration({
      email: email.trim(),
      full_name: fullName.trim(),
      password,
    });
    setLoading(false);
    if (r.error || !r.accessToken) {
      setError(r.error ?? "Could not create account.");
      return;
    }
    setSession(r.user, r.accessToken);
    router.push("/dashboard");
  }

  function onOtpChange(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = d;
    setOtp(next);
    if (d && i < 5) otpRefs.current[i + 1]?.focus();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-12 bg-[#0e0e10] px-6 py-12 text-[#e5e1e4] selection:bg-white selection:text-black">
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

      <div className="w-full max-w-[400px]">
        {step === "email" ? (
          <section className="rounded-sm border border-zinc-200 bg-white p-8">
            <div className="mb-8">
              <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
                Create account
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Enter your work email to get started.
              </p>
            </div>
            <form className="space-y-4" onSubmit={onEmail}>
              <div className="space-y-1.5">
                <label className={labelAuth} htmlFor="reg-email">
                  Email Address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-sm border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-950 outline-none placeholder:text-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 font-poppins"
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
                className="w-full rounded-sm bg-zinc-950 py-3 font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="mx-auto size-4 animate-spin" />
                ) : (
                  "Continue"
                )}
              </button>
            </form>
            <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-6">
              <span className="text-xs text-zinc-400">Have an account?</span>
              <Link
                href="/login"
                className="text-xs font-semibold text-zinc-950 hover:underline"
              >
                Sign in
              </Link>
            </div>
          </section>
        ) : null}

        {step === "otp" ? (
          <section className="rounded-sm border border-[#474747]/30 bg-[#131315] p-8">
            <StepDots step="otp" />
            <div className="mb-8 text-center">
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Verify email
              </h2>
              <p className="mt-1 text-sm text-[#c6c6c6]">
                We&apos;ve sent a code to your inbox
              </p>
            </div>
            <form className="space-y-8" onSubmit={onVerifyOtp}>
              <div className="flex justify-center gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    className={otpBox}
                    maxLength={1}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={digit}
                    onChange={(e) => onOtpChange(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[i] && i > 0) {
                        otpRefs.current[i - 1]?.focus();
                      }
                    }}
                  />
                ))}
              </div>
              {error ? (
                <p className="text-center text-sm text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-sm bg-white py-3 font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="mx-auto size-4 animate-spin text-zinc-950" />
                  ) : (
                    "Verify Code"
                  )}
                </button>
                <button
                  type="button"
                  disabled={resendSecs > 0}
                  className="w-full text-xs font-medium text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
                  onClick={async () => {
                    setError(null);
                    await registerSendOtp(email.trim());
                    setResendSecs(45);
                  }}
                >
                  {resendSecs > 0
                    ? `Resend code (${resendSecs}s)`
                    : "Resend code"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {step === "profile" ? (
          <section className="rounded-sm border border-[#474747]/30 bg-[#131315] p-8">
            <StepDots step="profile" />
            <div className="mb-8">
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Complete Profile
              </h2>
              <p className="mt-1 text-sm text-[#c6c6c6]">
                Setup your architect credentials
              </p>
            </div>
            <form className="space-y-5" onSubmit={onComplete}>
              <div className="space-y-1.5">
                <label className={labelDark} htmlFor="full-name">
                  Full Name
                </label>
                <input
                  id="full-name"
                  required
                  placeholder="John Architect"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-sm border border-[#474747] bg-[#1c1b1d] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-white focus:ring-0 font-poppins"
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelDark} htmlFor="pw">
                  Create Password
                </label>
                <input
                  id="pw"
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-sm border border-[#474747] bg-[#1c1b1d] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-white focus:ring-0 font-poppins"
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelDark} htmlFor="pw2">
                  Confirm Password
                </label>
                <input
                  id="pw2"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-sm border border-[#474747] bg-[#1c1b1d] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-white focus:ring-0 font-poppins"
                />
              </div>
              {error ? (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full rounded-sm bg-white py-3 font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="mx-auto size-4 animate-spin" />
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
            <p className="mt-8 text-center text-[10px] leading-relaxed text-zinc-500">
              By clicking Create Account, you agree to our{" "}
              <span className="cursor-pointer text-white hover:underline">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="cursor-pointer text-white hover:underline">
                Infrastructure Policy
              </span>
              .
            </p>
          </section>
        ) : null}
      </div>


    </div>
  );
}
