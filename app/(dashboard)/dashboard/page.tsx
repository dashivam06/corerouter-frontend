"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import {
  BarChart2,
  Cpu,
  Key,
  Plus,
  CreditCard,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  fetchActivity,
  fetchApiKeys,
  fetchTransactions,
  getDashboardPie,
  getSpendSeries,
} from "@/lib/api";
import { formatNPR, formatRelative } from "@/lib/formatters";
import { StatCard } from "@/components/cards/stat-card";
import { QuickActionCard } from "@/components/cards/quick-action-card";
import { SpendLineChart } from "@/components/charts/spend-line-chart";
import { ModelTypePie, ModelTypePieLegend } from "@/components/charts/model-type-pie";
import { mockTasks } from "@/lib/mock-data";

type SpendRange = "week" | "month" | "6mos" | "year";

export default function DashboardHomePage() {
  const user = useAuthStore((s) => s.user);
  const first = user?.full_name?.split(/\s+/)[0] ?? "there";
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const { data: keys } = useQuery({ queryKey: ["api-keys"], queryFn: fetchApiKeys });
  const { data: activity } = useQuery({ queryKey: ["activity"], queryFn: fetchActivity });
  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
  });

  const [spendRange, setSpendRange] = useState<SpendRange>("month");
  const series = useMemo(() => getSpendSeries(spendRange), [spendRange]);
  const chartData = useMemo(
    () =>
      series.map((value, i) => ({
        label:
          spendRange === "week"
            ? ["M", "T", "W", "T", "F", "S", "S"][i] ?? String(i)
            : spendRange === "year"
              ? String(i + 1)
              : String(i + 1),
        value,
      })),
    [series, spendRange]
  );

  const activeKeys = keys?.filter((k) => k.status === "ACTIVE").length ?? 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const tasksThisMonth = mockTasks.filter(
    (t) => new Date(t.created_at) >= monthStart
  ).length;
  const pieData = getDashboardPie();

  const transactionsList = transactions ?? [];

  const consumptionToday = mockTasks
    .filter((t) => new Date(t.created_at).getTime() >= todayStart.getTime())
    .reduce((a, t) => a + (t.total_cost ?? 0), 0);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-950">
          {greet}, {first}
        </h1>
        <p className="mt-0.5 text-[13px] text-zinc-400">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-zinc-950 p-5 text-white">
          <p className="text-xs text-zinc-400">Your balance</p>
          <p className="mt-1 text-[28px] font-semibold">
            {formatNPR(user?.balance ?? 0)}
          </p>
          <Link
            href="/dashboard/billing"
            className="mt-2 inline-block text-xs text-zinc-300 underline-offset-4 hover:underline"
          >
            Add balance →
          </Link>
        </div>
        <StatCard label="Active API keys" value={activeKeys} />
        <StatCard label="Tasks this month" value={tasksThisMonth} />
        <StatCard
          label="Today's consumption"
          value={
            <span className={consumptionToday > 0 ? "text-green-600" : "text-zinc-950"}>
              {formatNPR(consumptionToday)}
            </span>
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <p className="text-[13px] font-medium text-zinc-500">
              Spending — last{" "}
              {spendRange === "week"
                ? "7 days"
                : spendRange === "month"
                  ? "30 days"
                  : spendRange === "6mos"
                    ? "6 months"
                    : "12 months"}
            </p>
            <select
              value={spendRange}
              onChange={(e) => setSpendRange(e.target.value as SpendRange)}
              className="ml-auto rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20"
            >
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="6mos">6 months</option>
              <option value="year">Year</option>
            </select>
          </div>
          <SpendLineChart data={chartData} />
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-1 text-[13px] font-medium text-zinc-500">
            Usage by model type
          </p>
          <ModelTypePie data={pieData} />
          <ModelTypePieLegend data={pieData} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="mb-3 text-[13px] font-medium text-zinc-500">
            Recent activity
          </p>
          <div className="rounded-2xl border border-zinc-200 bg-white px-4">
            {(activity ?? []).slice(0, 7).map((a, i, arr) => (
              <div
                key={a.id}
                className={`flex items-center justify-between py-3 ${
                  i < arr.length - 1 ? "border-b border-zinc-100" : ""
                }`}
              >
                <span className="text-[13px] text-zinc-900">
                  {a.description}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {formatRelative(new Date(a.created_at))}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/usage"
            className="mt-3 block text-right text-xs text-zinc-400 hover:text-zinc-700"
          >
            View all activity →
          </Link>
        </div>
        <div>
          <p className="mb-3 text-[13px] font-medium text-zinc-500">
            Quick actions
          </p>
          <div className="flex flex-col gap-2">
            <QuickActionCard
              href="/dashboard/api-keys"
              icon={Key}
              label="New API key"
            />
            <QuickActionCard
              href="/dashboard/billing"
              icon={Plus}
              label="Add balance"
            />
            <QuickActionCard
              href="/admin/transactions"
              icon={CreditCard}
              label="Transactions"
            />
            <QuickActionCard href="/models" icon={Cpu} label="Browse models" />
            <QuickActionCard
              href="/dashboard/usage"
              icon={BarChart2}
              label="View usage"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
