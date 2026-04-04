"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function BillingSuccessPage() {
  const params = useSearchParams();
  const amount = params.get("amount");
  const transactionUuid = params.get("transaction_uuid");

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-6 py-16 text-center">
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-emerald-600">Payment Successful!</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">
          {amount ? `NPR ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Wallet top-up complete"}
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          {amount ? `NPR ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been added to your wallet.` : "Your wallet has been credited."}
        </p>
        {transactionUuid ? (
          <p className="mt-3 break-all rounded-2xl bg-zinc-50 px-4 py-3 font-mono text-xs text-zinc-600">
            Transaction ID: {transactionUuid}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white">
            Back to Dashboard
          </Link>
          <Link href="/dashboard/billing" className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700">
            View Balance
          </Link>
        </div>
      </div>
    </div>
  );
}
