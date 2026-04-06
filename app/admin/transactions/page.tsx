"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Clipboard,
  CreditCard,
} from "lucide-react";
import {
  ResponsiveContainer,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminStatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { adminFetchBillingInsights, adminFetchTasks, adminFetchTransactions, adminFetchUsersPage } from "@/lib/admin-api";
import { formatNPR, formatRelative } from "@/lib/formatters";
import type { AdminTransaction } from "@/lib/admin-mock-data";
import { AdminDetailDrawer } from "@/components/admin/detail-drawer";
import { chartTheme } from "@/lib/charts";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

type ChartRange = "7d" | "14d" | "1m" | "3m" | "6m" | "1y";

const CHART_RANGE_LABELS: Record<ChartRange, string> = {
  "7d": "last 7 days",
  "14d": "last 14 days",
  "1m": "last 1 month",
  "3m": "last 3 months",
  "6m": "last 6 months",
  "1y": "last 1 year",
};

const TABLE_PAGE_SIZE = 5;

function roundToTwo(value: number): number {
  return Number(value.toFixed(2));
}

export default function AdminTransactionsPage() {
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const [type, setType] = useState<"ALL" | "WALLET" | "CARD" | "WALLET_TOPUP">("ALL");
  const [dateFilter, setDateFilter] = useState<"TODAY" | "ALL">("TODAY");
  const [q, setQ] = useState("");
  const [chartRange, setChartRange] = useState<ChartRange>("7d");
  const [tablePage, setTablePage] = useState(1);

  const { data: allTxs } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: () => adminFetchTransactions({ filterPeriod: "all" }),
  });
  const { data: txs } = useQuery({
    queryKey: ["admin-transactions-table", dateFilter, type],
    queryFn: () =>
      adminFetchTransactions({
        filterPeriod: dateFilter === "TODAY" ? "today" : "all",
        transactionType: type === "ALL" ? undefined : type,
      }),
  });
  const { data: billingInsights } = useQuery({
    queryKey: ["admin-billing-insights"],
    queryFn: adminFetchBillingInsights,
  });
  const { data: tasks } = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: adminFetchTasks,
  });
  const { data: usersPage } = useQuery({
    queryKey: ["admin-users-page", 0, 1000],
    queryFn: () => adminFetchUsersPage({ page: 0, size: 1000 }),
  });

  const list = txs ?? [];
  const baseList = allTxs ?? list;
  const taskList = tasks ?? [];
  const userList = useMemo(
    () =>
      (usersPage?.users ?? []).map((u) => ({
        user_id: u.userId,
        full_name: u.fullName,
        email: u.email,
      })),
    [usersPage]
  );

  const todayStart = useMemo(() => startOfDay(new Date()), []);
  const yesterdayStart = useMemo(() => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - 1);
    return d;
  }, []);
  const monthStart = useMemo(() => {
    const d = startOfDay(new Date());
    d.setDate(1);
    return d;
  }, []);

  const filtered = useMemo(() => {
    let out = list;
    const s = q.trim().toLowerCase();
    if (s) {
      out = out.filter((t) => {
        const u = userList.find((x) => x.user_id === t.user_id);
        return (
          (t.esewa_transaction_id ?? "").toLowerCase().includes(s) ||
          (u?.full_name ?? "").toLowerCase().includes(s) ||
          (u?.email ?? "").toLowerCase().includes(s)
        );
      });
    }
    return out;
  }, [list, q, userList]);

  const totalTablePages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / TABLE_PAGE_SIZE)),
    [filtered.length]
  );

  const pagedTransactions = useMemo(() => {
    const start = (tablePage - 1) * TABLE_PAGE_SIZE;
    return filtered.slice(start, start + TABLE_PAGE_SIZE);
  }, [filtered, tablePage]);

  useEffect(() => {
    setTablePage(1);
  }, [dateFilter, type, q]);

  useEffect(() => {
    if (tablePage > totalTablePages) {
      setTablePage(totalTablePages);
    }
  }, [tablePage, totalTablePages]);

  const selected = useMemo(
    () => list.find((t) => t.transaction_id === drawerId) ?? null,
    [list, drawerId]
  );

  const stats = useMemo(() => {
    const completed = baseList.filter((t) => t.status === "COMPLETED");
    const transactionsToday = completed.filter((t) => {
      const d = new Date(t.completed_at ?? t.created_at);
      return d.getTime() >= todayStart.getTime();
    });

    const thisMonthCompleted = completed.filter((t) => {
      const d = new Date(t.completed_at ?? t.created_at);
      return d.getTime() >= monthStart.getTime();
    });

    const topUpToday = transactionsToday
      .filter((t) => t.type === "WALLET_TOPUP")
      .reduce((a, t) => a + (t.amount ?? 0), 0);

    const topUpAllTime = completed
      .filter((t) => t.type === "WALLET_TOPUP")
      .reduce((a, t) => a + (t.amount ?? 0), 0);

    const transactionsVolumeYesterday = completed
      .filter((t) => {
        const d = new Date(t.completed_at ?? t.created_at);
        const ts = d.getTime();
        return ts >= yesterdayStart.getTime() && ts < todayStart.getTime();
      })
      .reduce((a, t) => a + (t.amount ?? 0), 0);

    const consumptionToday = taskList
      .filter((t) => new Date(t.created_at).getTime() >= todayStart.getTime())
      .reduce((a, t) => a + (t.total_cost ?? 0), 0);

    const todayTotal = transactionsToday.reduce((a, t) => a + (t.amount ?? 0), 0);
    const deltaPercent = transactionsVolumeYesterday > 0 
      ? ((todayTotal - transactionsVolumeYesterday) / transactionsVolumeYesterday) * 100 
      : 0;

    return {
      total: baseList.length,
      volume: completed.reduce((a, t) => a + (t.amount ?? 0), 0),
      thisMonthVolume: thisMonthCompleted.reduce((a, t) => a + (t.amount ?? 0), 0),
      topUpToday,
      topUpAllTime,
      transactionsVolumeToday: todayTotal,
      transactionsVolumeYesterday,
      deltaPercent,
      consumptionToday,
    };
  }, [baseList, monthStart, taskList, todayStart, yesterdayStart]);

  const chartData = useMemo(() => {
    const completed = baseList.filter((t) => t.status === "COMPLETED");
    const now = new Date();

    if (chartRange === "7d" || chartRange === "14d" || chartRange === "1m") {
      const days = chartRange === "7d" ? 7 : chartRange === "14d" ? 14 : 30;
      const start = startOfDay(now);
      start.setDate(start.getDate() - (days - 1));

      return Array.from({ length: days }, (_, i) => {
        const d0 = new Date(start);
        d0.setDate(start.getDate() + i);
        const d1 = new Date(d0);
        d1.setDate(d0.getDate() + 1);

        const amount = completed
          .filter((t) => {
            const ts = new Date(t.completed_at ?? t.created_at).getTime();
            return ts >= d0.getTime() && ts < d1.getTime();
          })
          .reduce((a, t) => a + (t.amount ?? 0), 0);

        return {
          label:
            days <= 14
              ? d0.toLocaleDateString(undefined, { weekday: "short" })
              : d0.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          value: roundToTwo(amount),
        };
      });
    }

    const months = chartRange === "3m" ? 3 : chartRange === "6m" ? 6 : 12;
    const startMonth = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    return Array.from({ length: months }, (_, i) => {
      const m0 = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
      const m1 = new Date(startMonth.getFullYear(), startMonth.getMonth() + i + 1, 1);

      const amount = completed
        .filter((t) => {
          const ts = new Date(t.completed_at ?? t.created_at).getTime();
          return ts >= m0.getTime() && ts < m1.getTime();
        })
        .reduce((a, t) => a + (t.amount ?? 0), 0);

      return {
        label: m0.toLocaleDateString(undefined, { month: "short" }),
        value: roundToTwo(amount),
      };
    });
  }, [baseList, chartRange]);

  return (
    <div>
      <AdminHeader
        title="Transactions"
        subtitle="Review payment volume, settlement status, and audit details."
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl bg-zinc-950 p-5 text-white">
          <p className="text-xs text-zinc-400">Total user balance</p>
          <p className="mt-1 text-[28px] font-semibold">
            {formatNPR(billingInsights?.totalBalance ?? stats.volume)}
          </p>
          <p className={`mt-2 text-xs ${stats.deltaPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.deltaPercent >= 0 ? '↑' : '↓'} {Math.abs(stats.deltaPercent).toFixed(1)}% from yesterday
          </p>
        </div>
        <AdminStatCard label="This month's volume" value={formatNPR(billingInsights?.thisMonthVolume ?? stats.thisMonthVolume)} />
        <AdminStatCard label="Today's top-ups" value={formatNPR(billingInsights?.todayTopUpAmount ?? stats.topUpToday)} />
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-3">
          <p className="text-sm font-medium text-zinc-500">
            Daily transaction volume (रू) — {CHART_RANGE_LABELS[chartRange]}
          </p>
          <select
            value={chartRange}
            onChange={(e) => setChartRange(e.target.value as ChartRange)}
            className="ml-auto rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20"
            aria-label="Transaction chart range"
          >
            <option value="7d">7 days</option>
            <option value="14d">14 days</option>
            <option value="1m">1 month</option>
            <option value="3m">3 months</option>
            <option value="6m">6 months</option>
            <option value="1y">1 year</option>
          </select>
        </div>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...chartTheme.grid} vertical={false} />
              <XAxis dataKey="label" tick={chartTheme.axis.tick} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
              <YAxis
                tick={chartTheme.axis.tick}
                axisLine={false}
                tickLine={false}
                width={64}
                tickFormatter={(v) => `रू ${Number(v).toFixed(0)}`}
              />
              <Tooltip contentStyle={chartTheme.tooltip.contentStyle} />
              <Bar dataKey="value" fill="#09090b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400 uppercase">Date</span>
            <button
              type="button"
              onClick={() => setDateFilter("TODAY")}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                dateFilter === "TODAY"
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateFilter("ALL")}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                dateFilter === "ALL"
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              All
            </button>
          </div>
          <div className="h-5 border-l border-zinc-200"></div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400 uppercase">Type</span>
            {(["ALL", "WALLET", "CARD", "WALLET_TOPUP"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                  type === t ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100"
                }`}
              >
                {t === "WALLET_TOPUP" ? "Wallet Topup" : t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search user/email or eSewa ID"
            className="ml-auto w-64 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">User</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">eSewa ID</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">Type</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wide text-zinc-500">Amount</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">Status</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wide text-zinc-500">Date</th>
            </tr>
          </thead>
          <tbody>
            {pagedTransactions.map((t) => {
              const u = userList.find((x) => x.user_id === t.user_id);
              return (
                <tr
                  key={t.transaction_id}
                  className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer"
                  onClick={() => setDrawerId(t.transaction_id)}
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-zinc-900">{u?.full_name ?? "—"}</div>
                    <div className="text-xs text-zinc-400">{u?.email ?? ""}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="group flex items-center gap-2">
                      <span className="truncate max-w-[140px] font-mono text-xs text-zinc-500">
                        {t.esewa_transaction_id.slice(0, 20)}…
                      </span>
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(t.esewa_transaction_id);
                        }}
                        aria-label="Copy eSewa ID"
                      >
                        <Clipboard className="size-4 text-zinc-400" />
                      </button>
                    </div>
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
                    {formatRelative(new Date(t.created_at))}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-zinc-400">
                  No transactions.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {filtered.length > 0 ? (
          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-sm">
            <p className="text-zinc-500">
              Showing {(tablePage - 1) * TABLE_PAGE_SIZE + 1}
              -{Math.min(tablePage * TABLE_PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                disabled={tablePage === 1}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-zinc-600">
                Page {tablePage} of {totalTablePages}
              </span>
              <button
                type="button"
                onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
                disabled={tablePage === totalTablePages}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <AdminDetailDrawer
        open={drawerId != null}
        onOpenChange={(o) => !o && setDrawerId(null)}
        title="Transaction"
        width={400}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-zinc-50 p-4">
              <div className="text-xs text-zinc-400">eSewa Transaction ID</div>
              <div className="mt-2 font-mono text-sm text-zinc-950 rounded-xl bg-zinc-50 p-3">
                {selected.esewa_transaction_id}
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(selected.esewa_transaction_id)}
                className="mt-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Copy
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-zinc-400">Type</div>
                <div className="mt-2">
                  <StatusBadge status={selected.type} />
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Status</div>
                <div className="mt-2">
                  <StatusBadge status={selected.status} />
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-zinc-400">Amount</div>
                <div className="mt-2 text-2xl font-semibold text-zinc-950">
                  {formatNPR(selected.amount)}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Created at</div>
                <div className="mt-2 text-zinc-900">
                  {new Date(selected.created_at).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Completed at</div>
                <div className="mt-2 text-zinc-900">
                  {selected.completed_at ? new Date(selected.completed_at).toLocaleString() : "—"}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-zinc-400">Product code</div>
                <div className="mt-2 text-zinc-900">
                  {selected.product_code ?? "—"}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="text-xs text-zinc-400">User link</div>
              <div className="mt-1 text-sm text-zinc-700">
                <Link
                  href={`/admin/users`}
                  className="underline underline-offset-4"
                >
                  Go to user
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </AdminDetailDrawer>
    </div>
  );
}

