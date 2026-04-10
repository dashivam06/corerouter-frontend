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
import {
  setAuthProfileStorage,
  setAuthTokenStorage,
  setRefreshTokenCookie,
} from "@/lib/auth";
import { useAuthStore } from "@/stores/auth-store";

type Step = "email" | "otp" | "profile";

const labelAuth =
  "text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-poppins";
const labelDark =
  "text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-poppins";
const otpBox =
  "h-14 w-12 rounded-sm border border-[#474747] bg-[#1c1b1d] text-center text-lg text-white outline-none focus:border-white font-poppins";

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

function StepDots({
  step,
  compact = false,
}: {
  step: Step;
  compact?: boolean;
}) {
  const idx = step === "email" ? 0 : step === "otp" ? 1 : 2;
  return (
    <div className={`${compact ? "mb-5" : "mb-10"} flex items-center justify-center gap-2`}>
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
  const [verificationId, setVerificationId] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [subscribeMarketing, setSubscribeMarketing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [resendSecs, setResendSecs] = useState(0);
  const [profileTtlSecs, setProfileTtlSecs] = useState(0);
  const profileImageInputRef = useRef<HTMLInputElement | null>(null);

  async function finalizeSession(
    user: NonNullable<Awaited<ReturnType<typeof completeRegistration>>["user"]>,
    tokens: { accessToken: string; refreshToken: string; expiresIn: number }
  ) {
    setAuthTokenStorage(tokens.accessToken);
    setRefreshTokenCookie(tokens.refreshToken);

    setSession(user, tokens);
    setAuthProfileStorage(user);

    router.push("/dashboard");
  }

  useEffect(() => {
    if (resendSecs <= 0) return;
    const t = setInterval(() => setResendSecs((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendSecs]);

  useEffect(() => {
    if (profileTtlSecs <= 0) return;
    const t = setInterval(() => {
      setProfileTtlSecs((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [profileTtlSecs]);

  useEffect(() => {
    return () => {
      if (profileImagePreview) {
        URL.revokeObjectURL(profileImagePreview);
      }
    };
  }, [profileImagePreview]);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setError(null);
    setLoading(true);
    const r = await registerSendOtp(email.trim());
    setLoading(false);
    if (!r.ok) {
      setFieldErrors(r.fieldErrors ?? {});
      if (r.status === 429) setResendSecs(45);
      setError(r.error ?? "Could not send code.");
      return;
    }
    setVerificationId(r.verificationId ?? "");
    setResendSecs(45);
    setStep("otp");
  }

  function onGoogleCreate() {
    setFieldErrors({});
    setError(null);
    setSocialLoading("google");

    window.location.assign("https://api.corerouter.me/oauth2/authorization/google");
  }

  function onGitHubCreate() {
    setFieldErrors({});
    setError(null);
    setSocialLoading("github");

    window.location.assign("https://api.corerouter.me/oauth2/authorization/github");
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!verificationId) {
      setError("Please request a new OTP code.");
      setStep("email");
      return;
    }
    const code = otp.join("");
    setFieldErrors({});
    setError(null);
    setLoading(true);
    const r = await verifyOtp(verificationId, code);
    setLoading(false);
    if (!r.ok) {
      setFieldErrors(r.fieldErrors ?? {});
      if (r.status === 401) {
        setVerificationId("");
        setOtp(["", "", "", "", "", ""]);
        setResendSecs(0);
        setStep("email");
      }
      if (r.status === 410) {
        setResendSecs(0);
      }
      if (r.status === 429) {
        setResendSecs(45);
      }
      setError(r.error ?? "Invalid code.");
      return;
    }
    if (r.data?.verificationId) {
      setVerificationId(r.data.verificationId);
    }
    if (r.data?.profileCompletionTtlMinutes) {
      setProfileTtlSecs(r.data.profileCompletionTtlMinutes * 60);
    }
    setStep("profile");
  }

  async function onComplete(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!verificationId) {
      setError("Session expired. Please restart registration.");
      setStep("email");
      return;
    }
    setError(null);
    setLoading(true);
    const r = await completeRegistration({
      verificationId,
      email: email.trim(),
      full_name: fullName.trim(),
      password,
      confirmPassword: confirm,
    });
    setLoading(false);
    if (r.error || !r.accessToken || !r.user) {
      setFieldErrors(r.fieldErrors ?? {});
      if (r.status === 410) {
        setVerificationId("");
        setOtp(["", "", "", "", "", ""]);
        setStep("email");
      }
      setError(r.error ?? "Could not create account.");
      return;
    }
    await finalizeSession(r.user, {
      accessToken: r.accessToken,
      refreshToken: r.refreshToken,
      expiresIn: r.expiresIn,
    });
  }

  function onOtpChange(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = d;
    setOtp(next);
    if (d && i < 5) otpRefs.current[i + 1]?.focus();
  }

  function onProfileImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setError(null);
    setProfileImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-12 bg-[#0e0e10] px-6 py-12 text-[#e5e1e4] selection:bg-white selection:text-black font-montserrat ">
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

      <div
        className={`w-full ${step === "profile" ? "max-w-[560px]" : "max-w-[400px]"}`}
      >
        {step === "email" ? (
          <section className="rounded-sm border border-zinc-200 bg-white p-8">
            <div className="mb-4">
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
                className="w-full rounded-sm bg-zinc-950 py-3 font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="mx-auto size-4 animate-spin" />
                ) : (
                  "Continue"
                )}
              </button>
            </form>
            <div className="my-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-300">
              {/* <span className="h-px flex-1 bg-zinc-200" /> */}
              {/* <span>or create with</span> */}
              {/* <span className="h-px flex-1 bg-zinc-200" /> */}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onGoogleCreate}
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
                onClick={onGitHubCreate}
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
              <span className="whitespace-nowrap text-xs text-zinc-400">Have an account?</span>
              <Link
                href="/login"
                className="whitespace-nowrap text-xs font-semibold text-zinc-950 hover:underline"
              >
                Sign in
              </Link>
            </div>
          </section>
        ) : null}

        {step === "otp" ? (
          <section className="overflow-hidden rounded-sm border border-[#474747]/30 bg-[#131315] p-8">
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
              {fieldErrors.otp ? (
                <p className="text-center text-sm text-red-400">{fieldErrors.otp}</p>
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
                    if (resendSecs > 0) return;
                    setError(null);
                    setFieldErrors({});
                    const resend = await registerSendOtp(email.trim());
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
            <StepDots step="profile" compact />
            <div className="mb-5">
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Complete Profile
              </h2>
              <p className="mt-1 text-sm text-[#c6c6c6]">
                Setup your architect credentials
              </p>
            </div>
            <form className="space-y-5" onSubmit={onComplete}>
              {profileTtlSecs > 0 ? (
                <p className="text-xs text-zinc-400">
                  Complete registration in {Math.floor(profileTtlSecs / 60)}:
                  {(profileTtlSecs % 60).toString().padStart(2, "0")}
                </p>
              ) : null}
              <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-x-6 gap-y-4">
                <div className="space-y-1.5">
                  <label className={labelDark} htmlFor="verified-email">
                    Verified Email
                  </label>
                  <div
                    id="verified-email"
                    aria-disabled="true"
                    className="w-full cursor-not-allowed rounded-sm border border-[#474747] bg-[#18181a] px-4 py-3 opacity-80"
                  >
                    <p className="truncate font-poppins text-zinc-400">{email}</p>
                  </div>
                </div>
                <div className="row-span-2 flex shrink-0 flex-col items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => profileImageInputRef.current?.click()}
                    className="relative rounded-full"
                    aria-label="Upload profile image"
                  >
                    <img
                      src={
                        profileImagePreview ||
                        `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                          (fullName || email || "User").trim()
                        )}`
                      }
                      alt="Profile preview"
                      className="size-24 shrink-0 rounded-full border border-[#474747] bg-[#1c1b1d] object-cover"
                    />
                    <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border border-[#1c1b1d] bg-white text-xs font-bold text-zinc-900">
                      +
                    </span>
                  </button>
                  <input
                    ref={profileImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onProfileImageChange}
                  />
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                    Profile image
                  </p>
                </div>
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
                  {fieldErrors.fullName ? (
                    <p className="text-sm text-red-400">{fieldErrors.fullName}</p>
                  ) : null}
                </div>
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
                {fieldErrors.password ? (
                  <p className="text-sm text-red-400">{fieldErrors.password}</p>
                ) : null}
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
                {fieldErrors.confirmPassword ? (
                  <p className="text-sm text-red-400">{fieldErrors.confirmPassword}</p>
                ) : null}
              </div>
              <label className="flex items-start gap-3 rounded-sm border border-[#474747] bg-[#1c1b1d] p-3">
                <input
                  type="checkbox"
                  checked={subscribeMarketing}
                  onChange={(e) => setSubscribeMarketing(e.target.checked)}
                  className="mt-0.5 size-4 rounded-sm border border-zinc-500 bg-transparent accent-white"
                />
                <span className="text-xs leading-relaxed text-zinc-300">
                  Subscribe to marketing and product information emails.
                </span>
              </label>
              {error ? (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={loading || !subscribeMarketing}
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
