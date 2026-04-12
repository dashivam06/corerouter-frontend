"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clipboard } from "lucide-react";
import {
  getUserBillingInsights,
  fetchBalanceHistory,
  fetchTransactionHistory,
  initiateTopUp,
  type TransactionResponse,
} from "@/lib/api";
import { UserHeader } from "@/components/layout/user-header";
import { useAuthStore } from "@/stores/auth-store";
import { formatNPR, formatRelative } from "@/lib/formatters";
import { StatusBadge } from "@/components/shared/status-badge";
import { BalanceLineChart } from "@/components/charts/balance-line-chart";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { format } from "date-fns";

type LogoProps = {
  className?: string;
};

// Use newly added local brand assets
function EsewaLogo({ className }: LogoProps) {
  return (
    <img 
      src="/esewa.webp" 
      alt="eSewa logo" 
      className={className}
      style={{ height: '32px', width: 'auto', objectFit: 'contain', display: 'block' }}
    />
  );
}

function KhaltiLogo({ className }: LogoProps) {
  return (
    <img 
      src="/khalti.png" 
      alt="Khalti logo" 
      className={className}
      style={{ height: '32px', width: 'auto', objectFit: 'contain', display: 'block' }}
    />
  );
}

function VisaLogo({ className }: LogoProps) {
  return (
    <img 
      src="/visa.png" 
      alt="Visa logo" 
      className={className}
      style={{ height: '24px', width: 'auto', objectFit: 'contain', display: 'block' }}
    />
  );
}

export default function BillingPage() {
  const user = useAuthStore((s) => s.user);
  const { data: billingInsights } = useQuery({
    queryKey: ["billing-insights"],
    queryFn: getUserBillingInsights,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [amountSel, setAmountSel] = useState<number | null>(500);
  const [custom, setCustom] = useState("500");
  const [range, setRange] = useState<"7" | "15" | "30" | "3m" | "6m">("30");
  const [txType, setTxType] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<TransactionResponse | null>(null);
  const [topUpSubmitting, setTopUpSubmitting] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"esewa" | "khalti" | "visa">("esewa");

  const { data: txPage } = useQuery({
    queryKey: ["transactions-history", page, txType],
    queryFn: () =>
      fetchTransactionHistory({
        page,
        size: 6,
        type: txType === "all" ? undefined : txType,
      }),
  });

  const { data: balanceHistory } = useQuery({
    queryKey: ["balance-history", range],
    queryFn: () => fetchBalanceHistory({ period: range }),
  });

  const balance = billingInsights?.currentBalance ?? user?.balance ?? 0;

  const paginated = txPage?.content ?? [];
  const pages = Math.max(1, txPage?.totalPages ?? 1);

  const balanceSeries = useMemo(() => {
    return (balanceHistory?.balanceHistory ?? []).map((point) => ({
      date: point.date,
      balance: point.value,
    }));
  }, [balanceHistory]);

  const thisMonth = billingInsights?.creditsUsedThisMonth ?? 0;
  const deltaPct = Math.round(
    billingInsights?.creditsUsedChangeFromLastMonthPercent ?? 0
  );

  const totalSpend = billingInsights?.totalSpend ?? billingInsights?.spendingInSelectedPeriod ?? 0;
  const avgCostPerRequest = billingInsights?.avgCostPerRequest ?? 0;

  function payAmount(): number {
    if (amountSel != null) return amountSel;
    const c = Number(custom.replace(/[^\d.]/g, ""));
    return c || 0;
  }

  const low = balance < 100;
  const empty = balance <= 0;

  return (
    <>
      <UserHeader title="Billing" />

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-zinc-950 p-6 text-white">
          <p className="text-xs text-zinc-400">Current balance</p>
          <p className="mt-1 text-4xl font-semibold">{formatNPR(balance)}</p>
          {low && !empty ? (
            <p className="mt-3 text-sm text-amber-300">
              Low balance — consider adding funds
            </p>
          ) : null}
          {empty ? (
            <p className="mt-3 text-sm text-red-300">
              Insufficient balance — API requests will be rejected
            </p>
          ) : null}
          <Button
            type="button"
            className="mt-4 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-100"
            onClick={() => setAddOpen(true)}
          >
            Add balance
          </Button>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="text-xs font-medium text-zinc-500">Credits used this month</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-950">
            {formatNPR(thisMonth)}
          </p>
          <p
            className={`mt-2 text-xs ${deltaPct >= 0 ? "text-amber-600" : "text-green-600"}`}
          >
            {deltaPct >= 0 ? "↑" : "↓"} {Math.abs(deltaPct)}% from last month
          </p>
        </div>

        {/* <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="text-xs font-medium text-zinc-500">Total spend</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-950">{formatNPR(totalSpend)}</p>
          <p className="mt-2 text-xs text-zinc-500">Live usage insights</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="text-xs font-medium text-zinc-500">Avg cost / request</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-950">{formatNPR(avgCostPerRequest)}</p>
          <p className="mt-2 text-xs text-zinc-500">Current period</p>
        </div> */}
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-medium text-zinc-500">
            Balance history
          </p>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as typeof range)}
            className="ml-auto rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none"
          >
            <option value="7">7 days</option>
            <option value="15">15 days</option>
            <option value="30">30 days</option>
            <option value="3m">3 months</option>
            <option value="6m">6 months</option>
          </select>
        </div>
        <div className="min-h-[240px] w-full">
          <BalanceLineChart data={balanceSeries} />
        </div>
      </div>

      <div className="mt-8">
        <p className="mb-4 text-[15px] font-semibold text-zinc-950">
          Transaction history
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {(["all", "WALLET", "CARD", "WALLET_TOPUP"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTxType(t);
                setPage(0);
              }}
              className={`rounded-full px-3 py-1.5 text-sm ${ 
                txType === t
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {t === "all"
                ? "All"
                : t === "WALLET_TOPUP"
                  ? "Wallet Topup"
                  : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">eSewa ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((t) => (
                <tr
                  key={t.transactionId}
                  className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50"
                  onClick={() => setDetail(t)}
                >
                  <td className="max-w-[140px] truncate px-4 py-3 font-mono text-xs text-zinc-500">
                    <span className="group inline-flex items-center gap-1">
                      {t.esewaTransactionId ?? "—"}
                      {t.esewaTransactionId ? (
                        <button
                          type="button"
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(
                              t.esewaTransactionId ?? ""
                            );
                          }}
                        >
                          <Clipboard className="size-3" />
                        </button>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.type} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-medium">
                    {formatNPR(t.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-400">
                    {formatRelative(new Date(t.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex justify-end gap-2 text-sm text-zinc-500">
          <button
            type="button"
            disabled={page <= 0}
            className="rounded-lg border border-zinc-200 px-3 py-1 disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= pages - 1}
            className="rounded-lg border border-zinc-200 px-3 py-1 disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
          >
            Next
          </button>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent 
          className="w-[95vw] max-w-lg rounded-3xl border border-zinc-200 p-0 shadow-xl overflow-hidden max-h-[90vh]"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <div className="flex flex-col h-full max-h-[90vh] overflow-y-auto">
            {/* Top Section: Amount Selection */}
            <div className="bg-white p-6 sm:p-8 shrink-0">
              <DialogHeader className="mb-6 space-y-1 text-left">
                <DialogTitle className="text-xl font-bold tracking-tight">Add balance</DialogTitle>
                <p className="text-sm text-zinc-500">Select or enter the amount to top up.</p>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3">
                {[500, 1000, 2000, 5000].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setAmountSel(a);
                      setCustom(String(a));
                    }}
                    className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all ${
                      amountSel === a
                        ? "border-zinc-950 bg-zinc-950 text-white shadow-md ring-1 ring-zinc-950 ring-offset-2"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <span className={`text-[12px] font-medium ${amountSel === a ? "text-zinc-300" : "text-zinc-500"}`}>Amount</span>
                    <span className="mt-1 text-lg font-bold">रू {a}</span>
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <label className="text-sm font-medium text-zinc-800">Or enter custom amount</label>
                <div className="mt-2 flex items-center overflow-hidden rounded-2xl border-2 border-zinc-200 bg-white transition-colors focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-400/20">
                  <div className="flex h-12 items-center bg-zinc-50/50 px-4 text-zinc-500 border-r-2 border-zinc-200">
                    <span className="font-semibold text-base">रू</span>
                  </div>
                  <input
                    className="h-12 w-full bg-transparent px-4 text-lg font-semibold outline-none placeholder:text-zinc-300"
                    placeholder="500"
                    value={custom}
                    onChange={(e) => {
                      setCustom(e.target.value);
                      setAmountSel(null);
                    }}
                  />
                </div>
                {payAmount() > 0 && payAmount() < 500 ? (
                  <p className="mt-2.5 text-sm font-medium text-red-600">Minimum top-up is रू 500</p>
                ) : null}
              </div>
            </div>

            {/* Bottom Section: Payment Methods */}
            <div className="bg-zinc-50 p-6 sm:p-8 border-t border-zinc-200 shrink-0">
              <p className="mb-4 text-[15px] font-bold text-zinc-950 tracking-tight">Payment method</p>
              
              <div className="grid grid-cols-3 gap-3">
                {/* eSewa */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("esewa")}
                  className={`flex h-16 w-full items-center justify-center rounded-xl border-2 transition-all ${
                    paymentMethod === "esewa"
                      ? "border-green-500 bg-green-50/50 ring-4 ring-green-500/10 shadow-sm"
                      : "border-zinc-200 bg-white shadow-sm hover:border-zinc-300"
                  }`}
                >
                  <EsewaLogo className="h-6 w-auto drop-shadow-sm" />
                </button>

                {/* Khalti */}
                <button
                  type="button"
                  disabled
                  className="flex h-16 w-full items-center justify-center cursor-not-allowed rounded-xl border-2 border-zinc-200 bg-zinc-50 opacity-60 transition-all saturate-0"
                >
                  <KhaltiLogo className="h-6 w-auto mix-blend-luminosity opacity-80" />
                </button>

                {/* Visa */}
                <button
                  type="button"
                  disabled
                  className="flex h-16 w-full items-center justify-center cursor-not-allowed rounded-xl border-2 border-zinc-200 bg-zinc-50 opacity-60 transition-all saturate-0"
                >
                  <VisaLogo className="h-5 w-auto mix-blend-luminosity opacity-80" />
                </button>
              </div>

              <div className="mt-8">
                <button
                  type="button"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-medium text-white transition-all disabled:opacity-70 hover:brightness-110"
                  style={{ background: "#60BB46" }}
                  disabled={topUpSubmitting || paymentMethod !== "esewa" || payAmount() < 500}
                  onClick={async () => {
                    const amount = payAmount();
                    if (!amount || amount < 500) {
                      setTopUpError("Minimum top-up amount is NPR 500.00");
                      return;
                    }
                    setTopUpSubmitting(true);
                    setTopUpError(null);
                    try {
                      const formFields = await initiateTopUp(amount);
                      const paymentUrl =
                        formFields.payment_url ||
                        formFields.paymentUrl ||
                        formFields.esewa_url ||
                        formFields.esewaUrl ||
                        "https://esewa.com.np/epay/main";

                      const form = document.createElement("form");
                      form.method = "POST";
                      form.action = paymentUrl;
                      form.style.display = "none";
                      for (const [key, value] of Object.entries(formFields)) {
                        if (key === "payment_url" || key === "paymentUrl" || key === "esewa_url" || key === "esewaUrl") continue;
                        const input = document.createElement("input");
                        input.type = "hidden";
                        input.name = key;
                        input.value = value;
                        form.appendChild(input);
                      }
                      document.body.appendChild(form);
                      form.submit();
                    } catch (error) {
                      setTopUpError(error instanceof Error ? error.message : "Failed to initiate payment. Please try again.");
                      setTopUpSubmitting(false);
                    }
                  }}
                >
                  <EsewaLogo className="h-5 w-5 transition-transform group-hover:scale-110" />
                  {topUpSubmitting ? "Redirecting..." : "Pay with eSewa"}
                </button>

                {topUpError ? (
                  <p className="mt-2 text-center text-sm text-red-600">{topUpError}</p>
                ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent
          side="right"
          className="w-[400px] border-l border-zinc-200 shadow-none sm:max-w-[400px]"
        >
          {detail ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">Transaction</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 p-6 pt-2">
                <div>
                  <p className="text-xs text-zinc-400">eSewa Transaction ID</p>
                  <div className="mt-1 rounded-xl bg-zinc-50 p-3 font-mono text-sm text-zinc-950">
                    {detail.esewaTransactionId ?? "—"}
                  </div>
                  {detail.esewaTransactionId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 rounded-xl"
                      onClick={() =>
                        navigator.clipboard.writeText(
                          detail.esewaTransactionId ?? ""
                        )
                      }
                    >
                      Copy
                    </Button>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={detail.type} />
                  <StatusBadge status={detail.status} />
                </div>
                <p className="text-2xl font-semibold">
                  {formatNPR(detail.amount)}
                </p>
                <div className="space-y-2 text-sm text-zinc-600">
                  <p>
                    <span className="text-zinc-400">Created: </span>
                    {format(new Date(detail.createdAt), "PPpp")}
                  </p>
                  <p>
                    <span className="text-zinc-400">Completed: </span>
                    {detail.completedAt
                      ? format(new Date(detail.completedAt), "PPpp")
                      : "—"}
                  </p>
                  <p>
                    <span className="text-zinc-400">Product code: </span>
                    {detail.relatedTaskId ?? "—"}
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
