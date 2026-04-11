"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart2,
  Cpu,
  FileText,
  KeyRound,
  Key,
  Lock,
  Plus,
  CreditCard,
  Settings,
  User,
  WalletCards,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  type ActivityAction,
  fetchActivity,
  fetchDashboardInsights,
  fetchDashboardSpending,
  fetchDashboardUsageByModelType,
} from "@/lib/api";
import { formatNPR } from "@/lib/formatters";
import { StatCard } from "@/components/cards/stat-card";
import { QuickActionCard } from "@/components/cards/quick-action-card";
import { SpendLineChart } from "@/components/charts/spend-line-chart";
import { ModelTypePie } from "@/components/charts/model-type-pie";

type SpendRange = "week" | "month" | "6mos" | "year";

function toDashboardDateFilter(range: SpendRange) {
  if (range === "week") return "week";
  if (range === "month") return "month";
  if (range === "6mos") return "6m";
  return "year";
}

function parseUtcDate(value: string): Date {
  const normalized = value.includes("T") ? value : `${value}T00:00:00Z`;
  return new Date(normalized);
}

function generateDateRange(fromDate: string, toDate: string) {
  const dates: string[] = [];
  const current = parseUtcDate(fromDate);
  const end = parseUtcDate(toDate);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function parseActivityDate(value: string): Date {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date;
  return new Date(`${value}Z`);
}

function formatActivityCreatedAt(value: string): string {
  const created = parseActivityDate(value);
  const datePart = created.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const timePart = created.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return `${datePart} at ${timePart}`;
}

function getActivityIcon(action: ActivityAction) {
  if (action === "LOGIN" || action === "LOGOUT") {
    return { Icon: Lock, className: "text-blue-600" };
  }
  if (action === "UPDATE_PROFILE" || action === "CHANGE_PASSWORD") {
    return { Icon: User, className: "text-zinc-500" };
  }
  if (action === "SOFT_DELETE_ACCOUNT") {
    return { Icon: AlertTriangle, className: "text-red-600" };
  }
  if (action === "CREATE_API_KEY") {
    return { Icon: KeyRound, className: "text-green-600" };
  }
  if (action === "DEACTIVATE_API_KEY" || action === "DELETE_API_KEY") {
    return { Icon: KeyRound, className: "text-amber-600" };
  }
  if (action === "WALLET_TOPUP_SUCCESS") {
    return { Icon: WalletCards, className: "text-green-600" };
  }
  if (action.startsWith("ADMIN_")) {
    return { Icon: Settings, className: "text-violet-600" };
  }
  return { Icon: FileText, className: "text-zinc-500" };
}

export default function DashboardHomePage() {
  const user = useAuthStore((s) => s.user);
  const displayName = user?.full_name?.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || "there";
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const insightsQuery = useQuery({
    queryKey: ["dashboard-insights"],
    queryFn: fetchDashboardInsights,
  });
  const { data: activity } = useQuery({ queryKey: ["activity"], queryFn: fetchActivity });

  const [spendRange, setSpendRange] = useState<SpendRange>("month");
  const spendingQuery = useQuery({
    queryKey: ["dashboard-spending", spendRange],
    queryFn: () => fetchDashboardSpending({ dateFilter: toDashboardDateFilter(spendRange) }),
  });
  const usageQuery = useQuery({
    queryKey: ["dashboard-usage-by-model-type"],
    queryFn: fetchDashboardUsageByModelType,
  });

  const chartData = useMemo(() => {
    const spending = spendingQuery.data;
    if (!spending) return [];

    const days = generateDateRange(spending.fromDate, spending.toDate);
    const trendMap = new Map(spending.dailyTrend.map((point) => [point.date, point.value]));

    return days.map((date) => ({
      label: format(parseUtcDate(date), "MMM d"),
      value: trendMap.get(date) ?? 0,
    }));
  }, [spendingQuery.data]);

  const pieData = useMemo(() => {
    const counts = usageQuery.data?.usageByModelTypeCounts;
    if (!counts) return [];

    return (["LLM", "OCR", "OTHER"] as const).map((type) => ({
      type,
      name: type,
      value: counts[type] ?? 0,
    }));
  }, [usageQuery.data]);

  const activeKeys = insightsQuery.data?.activeApiKeys ?? 0;
  const tasksThisMonth = insightsQuery.data?.tasksThisMonth ?? 0;
  const consumptionToday = insightsQuery.data?.todaysConsumption ?? 0;
  const currentBalance = insightsQuery.data?.currentBalance ?? user?.balance ?? 0;

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-950">
          {greet}, {displayName}
        </h1>
        <p className="mt-0.5 text-[13px] text-zinc-400">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-zinc-950 p-5 text-white">
          <p className="text-xs text-zinc-400">Your balance</p>
          <p className="mt-1 text-[28px] font-semibold">
            {formatNPR(currentBalance)}
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
          <div className="min-h-[150px] w-full">
            <SpendLineChart data={chartData} />
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-1 text-[13px] font-medium text-zinc-500">
            Usage by model type
          </p>
          <div className="flex min-h-[150px] w-full items-start justify-start pt-2">
            <ModelTypePie data={pieData} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="mb-3 text-[13px] font-medium text-zinc-500">
            Recent activity
          </p>
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4">
            <div className="space-y-3">
              {(activity ?? []).slice(0, 4).map((a) => {
                const { Icon, className } = getActivityIcon(a.action);
                return (
                  <div key={a.id} className="rounded-xl border border-zinc-100 px-3 py-2">
                    <div className="flex items-start gap-3">
                      <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm text-zinc-900">{a.description}</p>
                      </div>
                      <div className="shrink-0">
                        <p className="flex items-center gap-3 whitespace-nowrap text-xs">
                          {/* <span className="break-all text-zinc-500">
                            {a.ipAddress && a.ipAddress !== "UNKNOWN"
                              ? `IP: ${a.ipAddress}`
                              : "IP: unknown"}
                          </span> */}
                          <span className="text-zinc-400">{formatActivityCreatedAt(a.created_at)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
