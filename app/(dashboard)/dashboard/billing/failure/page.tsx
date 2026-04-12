"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function BillingFailurePage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const next = new URLSearchParams(params.toString());
    if (!next.get("status")) {
      next.set("status", "failed");
    }
    router.replace(`/wallet/topup/result?${next.toString()}`);
  }, [params, router]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-6 py-16 text-center">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin" />
          Redirecting to payment result...
        </div>
      </div>
    </div>
  );
}
