"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, Loader2, RefreshCw, XCircle } from "lucide-react";
import { UserHeader } from "@/components/layout/user-header";
import {
  ApiRequestError,
  verifyTopUpFailureCallback,
  verifyTopUpSuccessCallback,
} from "@/lib/api";

type UiState = "verifying" | "success" | "failed" | "pending";
type PaymentStatus = "success" | "failed" | "pending" | "unknown";
type TelemetryEventName =
  | "payment_verification_started"
  | "payment_verification_success"
  | "payment_verification_failed"
  | "payment_verification_error";

declare global {
  interface Window {
    gtag?: (
      command: "event",
      eventName: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

function emitPaymentTelemetry(
  eventName: TelemetryEventName,
  params: Record<string, unknown>
) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("corerouter:telemetry", {
      detail: {
        eventName,
        ...params,
        timestamp: new Date().toISOString(),
      },
    })
  );

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}

function normalizeQueryParam(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.toLowerCase();
  if (normalized === "null" || normalized === "undefined") return null;
  return trimmed;
}

function normalizePaymentStatus(value: string | null): PaymentStatus {
  if (!value) return "unknown";
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "success" ||
    normalized === "completed" ||
    normalized === "complete"
  ) {
    return "success";
  }
  if (
    normalized === "failed" ||
    normalized === "failure" ||
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "error"
  ) {
    return "failed";
  }
  if (
    normalized === "pending" ||
    normalized === "processing" ||
    normalized === "in_progress"
  ) {
    return "pending";
  }
  return "unknown";
}

function parseAmountValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^\d.-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function decodeBase64Data(data: string): Record<string, unknown> {
  if (typeof window === "undefined") {
    throw new Error("Cannot decode callback payload outside browser runtime.");
  }

  const normalized = data
    .replace(/\s/g, "+")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = window.atob(padded);

  try {
    const parsed = JSON.parse(decoded) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const entries = Array.from(new URLSearchParams(decoded).entries());
    if (entries.length > 0) {
      return Object.fromEntries(entries);
    }
    throw new Error("Invalid callback payload.");
  }

  throw new Error("Invalid callback payload.");
}

function pickString(
  source: Record<string, unknown> | null,
  keys: string[]
): string | null {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string") {
      const normalized = normalizeQueryParam(value);
      if (normalized) return normalized;
    }
  }
  return null;
}

function pickAmount(
  source: Record<string, unknown> | null,
  keys: string[]
): number | null {
  if (!source) return null;
  for (const key of keys) {
    const amount = parseAmountValue(source[key]);
    if (amount != null) return amount;
  }
  return null;
}

function formatNprAmount(amount: number | null): string {
  if (amount == null) return "0.00";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function classifyVerificationError(error: unknown): {
  message: string;
  status: number | null;
  timeout: boolean;
  network: boolean;
} {
  if (error instanceof ApiRequestError) {
    const message = error.message || "Unable to verify payment.";
    return {
      message,
      status: error.status,
      timeout: error.status === 408 || message.toLowerCase().includes("timed out"),
      network: error.status === 0,
    };
  }

  if (error instanceof Error) {
    const message = error.message || "Unable to verify payment.";
    return {
      message,
      status: null,
      timeout: message.toLowerCase().includes("timed out"),
      network: message.toLowerCase().includes("network"),
    };
  }

  return {
    message: "Unable to verify payment.",
    status: null,
    timeout: false,
    network: false,
  };
}

function WalletTopUpResultContent() {
  const searchParams = useSearchParams();
  const requestIdRef = useRef(0);

  const [uiState, setUiState] = useState<UiState>("verifying");
  const [resolvedAmount, setResolvedAmount] = useState<number | null>(null);
  const [resolvedTransactionId, setResolvedTransactionId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const query = useMemo(() => {
    const status = normalizeQueryParam(searchParams?.get("status") ?? null);
    const tx =
      normalizeQueryParam(searchParams?.get("tx") ?? null) ||
      normalizeQueryParam(searchParams?.get("transaction_uuid") ?? null);
    const amount = normalizeQueryParam(searchParams?.get("amount") ?? null);
    const data = normalizeQueryParam(searchParams?.get("data") ?? null);

    return { status, tx, amount, data };
  }, [searchParams]);

  const verifyPayment = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const status = normalizePaymentStatus(query.status);

    setUiState("verifying");
    setNote(null);
    setVerifying(true);

    emitPaymentTelemetry("payment_verification_started", {
      callbackStatus: status,
      hasData: Boolean(query.data),
      hasTransactionId: Boolean(query.tx),
      hasAmount: Boolean(query.amount),
    });

    const queryAmount = parseAmountValue(query.amount);
    let decodedPayload: Record<string, unknown> | null = null;

    if (query.data) {
      try {
        decodedPayload = decodeBase64Data(query.data);
      } catch (error) {
        const errorMeta = classifyVerificationError(error);
        emitPaymentTelemetry("payment_verification_error", {
          callbackStatus: status,
          stage: "decode",
          message: errorMeta.message,
        });
        emitPaymentTelemetry("payment_verification_failed", {
          callbackStatus: status,
          reason: "invalid_callback_payload",
        });

        if (requestId !== requestIdRef.current) return;
        setResolvedAmount(queryAmount);
        setResolvedTransactionId(query.tx);
        setUiState("failed");
        setNote("Invalid callback payload. Please try the top-up flow again.");
        setVerifying(false);
        return;
      }
    }

    const payloadAmount = pickAmount(decodedPayload, [
      "amount",
      "total_amount",
      "totalAmount",
      "totalAmountNpr",
    ]);
    const payloadTransactionId = pickString(decodedPayload, [
      "transaction_uuid",
      "transactionUuid",
      "transaction_id",
      "transactionId",
      "tx",
    ]);

    const mergedAmount = payloadAmount ?? queryAmount;
    const mergedTransactionId = payloadTransactionId ?? query.tx;

    setResolvedAmount(mergedAmount);
    setResolvedTransactionId(mergedTransactionId);

    if (status === "failed") {
      try {
        await verifyTopUpFailureCallback({
          data: query.data ?? undefined,
          transactionUuid: mergedTransactionId ?? undefined,
          tx: query.tx ?? undefined,
          amount: mergedAmount != null ? String(mergedAmount) : undefined,
          status: query.status ?? undefined,
        });

        if (requestId !== requestIdRef.current) return;
        setUiState("failed");
        setNote(null);
        emitPaymentTelemetry("payment_verification_failed", {
          callbackStatus: status,
          transactionId: mergedTransactionId,
          amount: mergedAmount,
          reason: "payment_failure_callback",
        });
      } catch (error) {
        const errorMeta = classifyVerificationError(error);
        emitPaymentTelemetry("payment_verification_error", {
          callbackStatus: status,
          stage: "failure_verification",
          statusCode: errorMeta.status,
          message: errorMeta.message,
        });

        if (requestId !== requestIdRef.current) return;
        if (errorMeta.timeout || errorMeta.network) {
          setUiState("pending");
          setNote("Verification timed out. You can check again in a moment.");
        } else {
          setUiState("failed");
          setNote("We could not confirm your payment. Please try again.");
          emitPaymentTelemetry("payment_verification_failed", {
            callbackStatus: status,
            reason: "failure_verification_not_confirmed",
            statusCode: errorMeta.status,
          });
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setVerifying(false);
        }
      }
      return;
    }

    if (!query.data) {
      if (requestId !== requestIdRef.current) return;
      if (status === "pending" || status === "unknown") {
        setUiState("pending");
        setNote(null);
      } else {
        emitPaymentTelemetry("payment_verification_error", {
          callbackStatus: status,
          stage: "success_verification",
          message: "Missing callback payload data.",
        });
        emitPaymentTelemetry("payment_verification_failed", {
          callbackStatus: status,
          reason: "missing_callback_payload",
        });
        setUiState("failed");
        setNote("We could not confirm your payment. Please try again.");
      }
      setVerifying(false);
      return;
    }

    try {
      const verified = await verifyTopUpSuccessCallback(query.data);
      if (requestId !== requestIdRef.current) return;

      const verifiedAmount = parseAmountValue(verified.amount) ?? mergedAmount;
      const verifiedTransactionId =
        normalizeQueryParam(verified.transaction_uuid) ?? mergedTransactionId;

      setResolvedAmount(verifiedAmount);
      setResolvedTransactionId(verifiedTransactionId);
      setUiState("success");
      setNote(null);

      emitPaymentTelemetry("payment_verification_success", {
        callbackStatus: status,
        amount: verifiedAmount,
        transactionId: verifiedTransactionId,
      });
    } catch (error) {
      const errorMeta = classifyVerificationError(error);

      emitPaymentTelemetry("payment_verification_error", {
        callbackStatus: status,
        stage: "success_verification",
        statusCode: errorMeta.status,
        message: errorMeta.message,
      });

      if (requestId !== requestIdRef.current) return;

      if (status === "pending" || status === "unknown" || errorMeta.timeout) {
        setUiState("pending");
        setNote(
          errorMeta.timeout || errorMeta.network
            ? "Verification timed out. You can check again in a moment."
            : "We are still waiting for confirmation. You can check again in a moment."
        );
      } else {
        setUiState("failed");
        setNote("We could not confirm your payment. Please try again.");
        emitPaymentTelemetry("payment_verification_failed", {
          callbackStatus: status,
          statusCode: errorMeta.status,
          reason: "success_verification_not_confirmed",
        });
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setVerifying(false);
      }
    }
  }, [query.amount, query.data, query.status, query.tx]);

  useEffect(() => {
    void verifyPayment();
  }, [verifyPayment]);

  const title =
    uiState === "verifying"
      ? "Verifying your payment"
      : uiState === "success"
        ? "Payment successful"
        : uiState === "failed"
          ? "Payment failed"
          : "Payment is still processing";

  const body =
    uiState === "verifying"
      ? "Please wait while we confirm your transaction."
      : uiState === "success"
        ? "Your wallet has been credited successfully."
        : uiState === "failed"
          ? "We could not confirm your payment. Please try again."
          : "We are still waiting for confirmation. You can check again in a moment.";

  return (
    <>
      <UserHeader title="Wallet Top-up Result" />

      <section className="relative mt-8 min-h-[380px] w-full">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-full w-full max-w-4xl rounded-2xl border border-zinc-200/70 bg-white/60 backdrop-blur-md" aria-hidden="true" />

        <div className="relative mx-auto flex w-full max-w-2xl px-4 pt-6 sm:px-0">
          <div className="w-full rounded-2xl border border-zinc-200 bg-white/95 p-6 shadow-xl backdrop-blur-sm sm:p-8">
          <div
            className="flex items-start gap-3"
            role="status"
            aria-live="polite"
            aria-busy={uiState === "verifying"}
          >
            {uiState === "success" ? (
              <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" aria-hidden="true" />
            ) : null}
            {uiState === "failed" ? (
              <XCircle className="mt-0.5 size-5 text-red-600" aria-hidden="true" />
            ) : null}
            {uiState === "pending" ? (
              <Clock3 className="mt-0.5 size-5 text-amber-600" aria-hidden="true" />
            ) : null}
            {uiState === "verifying" ? (
              <Loader2 className="mt-0.5 size-5 animate-spin text-zinc-500" aria-hidden="true" />
            ) : null}

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{title}</h1>
              <p className="text-sm text-zinc-500">{body}</p>

              {uiState === "success" ? (
                <div className="mt-4 space-y-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                  <p>Amount: NPR {formatNprAmount(resolvedAmount)}</p>
                  <p className="break-all">Transaction ID: {resolvedTransactionId ?? "N/A"}</p>
                </div>
              ) : null}

              {note ? <p className="text-sm text-zinc-500">{note}</p> : null}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {uiState === "success" ? (
              <>
                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Go to Wallet
                </Link>
                <Link
                  href="/dashboard/billing?view=transactions"
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  View Transactions
                </Link>
              </>
            ) : null}

            {uiState === "failed" ? (
              <>
                <Link
                  href="/dashboard/billing?topup=1"
                  className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Try Again
                </Link>
                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Back to Wallet
                </Link>
              </>
            ) : null}

            {uiState === "pending" || uiState === "verifying" ? (
              <>
                <button
                  type="button"
                  onClick={() => void verifyPayment()}
                  disabled={verifying}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {verifying ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="size-4" aria-hidden="true" />
                  )}
                  Check Again
                </button>
                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Back to Wallet
                </Link>
              </>
            ) : null}
          </div>
        </div>
        </div>
      </section>
    </>
  );
}

function WalletTopUpResultFallback() {
  return (
    <>
      <UserHeader title="Wallet Top-up Result" />
      <section className="relative mt-8 min-h-[380px] w-full">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-full w-full max-w-4xl rounded-2xl border border-zinc-200/70 bg-white/60 backdrop-blur-md" aria-hidden="true" />

        <div className="relative mx-auto flex w-full max-w-2xl px-4 pt-6 sm:px-0">
          <div className="w-full rounded-2xl border border-zinc-200 bg-white/95 p-6 shadow-xl backdrop-blur-sm sm:p-8">
            <div className="flex items-start gap-3" role="status" aria-live="polite" aria-busy="true">
              <Loader2 className="mt-0.5 size-5 animate-spin text-zinc-500" aria-hidden="true" />
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
                  Verifying your payment
                </h1>
                <p className="text-sm text-zinc-500">
                  Please wait while we confirm your transaction.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function WalletTopUpResultPage() {
  return (
    <Suspense fallback={<WalletTopUpResultFallback />}>
      <WalletTopUpResultContent />
    </Suspense>
  );
}
