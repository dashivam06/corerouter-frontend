"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { UserHeader } from "@/components/layout/user-header";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const rawAmount = searchParams.get("amount");
  const amount = rawAmount ? (Number(rawAmount.replace(/,/g, ''))).toLocaleString('en-US', { minimumFractionDigits: 2 }) : "5,000.00";
  const transactionId = searchParams.get("transaction_uuid") || searchParams.get("oid") || "1_da991b23-9d7f-43e3-9e01-0295a137672d";

  return (
    <div 
      className="mx-auto mt-[10vh] max-w-lg rounded-3xl bg-white p-12 text-center"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      <h1 className="text-[28px] font-bold text-zinc-950 mb-2">Payment successful</h1>
      <p className="text-base font-medium text-zinc-600 mb-10">
        Your wallet has been credited successfully.
      </p>

      <div className="text-left mb-10 space-y-6">
        <div>
          <p className="text-sm font-semibold text-zinc-500 mb-1">Amount:</p>
          <p className="text-lg font-medium text-zinc-900">NPR {amount}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-500 mb-1">Transaction ID:</p>
          <p className="text-base font-medium text-zinc-800 break-all">{transactionId}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Link 
          href="/dashboard/billing"
          className="flex w-full items-center justify-center rounded-xl bg-zinc-950 px-5 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          Go to Wallet
        </Link>
        <Link 
          href="/dashboard/billing"
          className="flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-4 text-[15px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-50"
        >
          View Transactions
        </Link>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <>
      <UserHeader title="Billing" />
      <div className="px-6 py-4">
        <Suspense fallback={<div className="text-center text-zinc-500 mt-20">Loading...</div>}>
          <SuccessContent />
        </Suspense>
      </div>
    </>
  );
}
