"use client";

import Link from "next/link";

export default function BillingFailurePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-6 py-16 text-center">
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-red-600">Payment Not Completed</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-950">
          Your payment was cancelled or failed.
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          No amount has been deducted.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard/billing" className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white">
            Try Again
          </Link>
          <Link href="/dashboard" className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
