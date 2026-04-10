"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  forgotPasswordRequestOtp,
  forgotPasswordReset,
  forgotPasswordVerifyOtp,
} from "@/lib/api";

type Step = "email" | "otp" | "reset";

const label =
  "text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-poppins";
const otpBox =
  "h-14 w-12 rounded-sm border border-[#474747] bg-[#1c1b1d] text-center text-lg text-white outline-none focus:border-white font-poppins";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [resendSecs, setResendSecs] = useState(0);
  const [resetTtlSecs, setResetTtlSecs] = useState(0);

  useEffect(() => {
    if (resendSecs <= 0) return;
    const t = window.setInterval(() => setResendSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [resendSecs]);

  useEffect(() => {
    if (resetTtlSecs <= 0) return;
    const t = window.setInterval(() => setResetTtlSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [resetTtlSecs]);

  async function onRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setError(null);
    setLoading(true);
    const r = await forgotPasswordRequestOtp(email.trim());
    setLoading(false);

    if (!r.ok) {
      setFieldErrors(r.fieldErrors ?? {});
      if (r.status === 429) setResendSecs(45);
      setError(r.error ?? "Could not send reset code.");
      return;
    }

    setVerificationId(r.verificationId ?? "");
    setResendSecs(45);
    setStep("otp");
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!verificationId) {
      setError("Please request a new OTP code.");
      setStep("email");
      return;
    }

    setFieldErrors({});
    setError(null);
    setLoading(true);
    const r = await forgotPasswordVerifyOtp(verificationId, otp.join(""));
    setLoading(false);

    if (!r.ok) {
      setFieldErrors(r.fieldErrors ?? {});
      if (r.status === 401) {
        setVerificationId("");
        setOtp(["", "", "", "", "", ""]);
        setStep("email");
      }
      if (r.status === 410) setResendSecs(0);
      if (r.status === 429) setResendSecs(45);
      setError(r.error ?? "Invalid code.");
      return;
    }

    if (r.data?.verificationId) setVerificationId(r.data.verificationId);
    if (r.data?.profileCompletionTtlMinutes) {
      setResetTtlSecs(r.data.profileCompletionTtlMinutes * 60);
    }
    setStep("reset");
  }

  async function onResetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!verificationId) {
      setError("Session expired. Please restart forgot password.");
      setStep("email");
      return;
    }

    setFieldErrors({});
    setError(null);
    setLoading(true);

    const r = await forgotPasswordReset({
      verificationId,
      newPassword,
      confirmPassword,
    });

    setLoading(false);

    if (!r.ok) {
      setFieldErrors(r.fieldErrors ?? {});
      if (r.status === 410) {
        setVerificationId("");
        setStep("email");
      }
      setError(r.error ?? "Could not reset password.");
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("auth_notice", "password-reset-success");
    }
    router.push("/login");
  }

  function onOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-12 bg-[#0e0e10] px-6 py-12 text-[#e5e1e4] selection:bg-white selection:text-black font-montserrat">
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

      <div className="w-full max-w-[420px]">
        {step === "email" ? (
          <section className="rounded-sm border border-zinc-200 bg-white p-8">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Forgot password</h2>
            <p className="mt-1 text-sm text-zinc-500">Enter your registered email to receive OTP.</p>
            <form className="mt-5 space-y-4" onSubmit={onRequestOtp}>
              <div className="space-y-1.5">
                <label className={label} htmlFor="fp-email">Email Address</label>
                <input
                  id="fp-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-sm border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-950 outline-none placeholder:text-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 font-poppins"
                />
                {fieldErrors.email ? <p className="text-sm text-red-600">{fieldErrors.email}</p> : null}
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-sm bg-zinc-950 py-3 font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {loading ? <Loader2 className="mx-auto size-4 animate-spin" /> : "Send OTP"}
              </button>
            </form>
            <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-6">
              <Link href="/login" className="text-xs font-semibold text-zinc-950 hover:underline">Back to sign in</Link>
              <Link href="/register" className="text-xs font-semibold text-zinc-950 hover:underline">Create account</Link>
            </div>
          </section>
        ) : null}

        {step === "otp" ? (
          <section className="rounded-sm border border-[#474747]/30 bg-[#131315] p-8">
            <h2 className="text-xl font-semibold tracking-tight text-white">Verify OTP</h2>
            <p className="mt-1 text-sm text-zinc-300">Enter the 6-digit code sent to {email}.</p>
            <form className="mt-6 space-y-6" onSubmit={onVerifyOtp}>
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
              {fieldErrors.otp ? <p className="text-center text-sm text-red-400">{fieldErrors.otp}</p> : null}
              {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-sm bg-white py-3 font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
              >
                {loading ? <Loader2 className="mx-auto size-4 animate-spin text-zinc-950" /> : "Verify OTP"}
              </button>
              <button
                type="button"
                disabled={resendSecs > 0}
                className="w-full text-xs font-medium text-zinc-400 hover:text-white disabled:opacity-50"
                onClick={async () => {
                  if (resendSecs > 0) return;
                  setError(null);
                  setFieldErrors({});
                  const resend = await forgotPasswordRequestOtp(email.trim());
                  if (!resend.ok) {
                    setFieldErrors(resend.fieldErrors ?? {});
                    setError(resend.error ?? "Could not resend code.");
                    if (resend.status === 429) setResendSecs(45);
                    return;
                  }
                  if (resend.verificationId) setVerificationId(resend.verificationId);
                  setResendSecs(45);
                }}
              >
                {resendSecs > 0 ? `Resend OTP (${resendSecs}s)` : "Resend OTP"}
              </button>
            </form>
          </section>
        ) : null}

        {step === "reset" ? (
          <section className="rounded-sm border border-[#474747]/30 bg-[#131315] p-8">
            <h2 className="text-xl font-semibold tracking-tight text-white">Reset password</h2>
            {resetTtlSecs > 0 ? (
              <p className="mt-1 text-xs text-zinc-400">
                Complete reset in {Math.floor(resetTtlSecs / 60)}:{(resetTtlSecs % 60).toString().padStart(2, "0")}
              </p>
            ) : null}
            <form className="mt-5 space-y-4" onSubmit={onResetPassword}>
              <div className="space-y-1.5">
                <label className={label} htmlFor="new-password">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-sm border border-[#474747] bg-[#1c1b1d] px-4 py-3 text-white outline-none focus:border-white"
                />
                {fieldErrors.newPassword ? <p className="text-sm text-red-400">{fieldErrors.newPassword}</p> : null}
              </div>
              <div className="space-y-1.5">
                <label className={label} htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-sm border border-[#474747] bg-[#1c1b1d] px-4 py-3 text-white outline-none focus:border-white"
                />
                {fieldErrors.confirmPassword ? <p className="text-sm text-red-400">{fieldErrors.confirmPassword}</p> : null}
              </div>
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-sm bg-white py-3 font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
              >
                {loading ? <Loader2 className="mx-auto size-4 animate-spin text-zinc-950" /> : "Reset Password"}
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </div>
  );
}
