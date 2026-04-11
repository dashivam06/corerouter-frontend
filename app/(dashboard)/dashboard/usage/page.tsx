"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  FileText,
  KeyRound,
  Lock,
  Settings,
  User,
  WalletCards,
} from "lucide-react";
import {
  ApiRequestError,
  getUserActivityRecent,
  getUserUsageHistory,
  getUserUsageInsights,
  type UserActivityResponse,
  type BillingUsagePeriod,
} from "@/lib/api";
import { UserHeader } from "@/components/layout/user-header";
import { StatCard } from "@/components/cards/stat-card";
import { UsageStackedBar } from "@/components/charts/usage-stacked-bar";
import { unitTypeColors } from "@/lib/charts";
import { formatCost } from "@/lib/formatters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function parseActivityDate(value: string): Date {
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  return new Date(`${value}Z`);
}

function formatActivityFull(value: string): string {
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

function getActivityIcon(action: string) {
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

function mapActivityError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 429) return "Too many requests. Please slow down.";
    if (error.status === 503) return "Service temporarily unavailable. Try again later.";
    if (error.status === 500) return "Failed to load activity. Please try again.";
    if (error.status === 0) return "Unable to connect. Check your internet connection.";
    return error.message;
  }
  return "Failed to load activity. Please try again.";
}

function percentDelta(value: number | undefined): { label: string; positive: boolean } {
  const resolved = value ?? 0;
  const positive = resolved >= 0;
  const arrow = positive ? "↑" : "↓";
  return { label: `${arrow}${Math.abs(resolved)}% vs prior`, positive };
}

export default function UsagePage() {
  const [period, setPeriod] = useState<BillingUsagePeriod>("30days");
  const [activityPage, setActivityPage] = useState(0);

  const usageInsightsQuery = useQuery({
    queryKey: ["usage-insights", period],
    queryFn: () => getUserUsageInsights({ period }),
  });

  const usageHistoryQuery = useQuery({
    queryKey: ["usage-history", period],
    queryFn: () => getUserUsageHistory({ period }),
  });

  const {
    data: activityPageData,
    isLoading: activityLoading,
    isError: activityErrored,
    error: activityError,
  } = useQuery({
    queryKey: ["user-activity", activityPage],
    queryFn: () => getUserActivityRecent({ page: activityPage, size: 20 }),
  });

  const unitKeys = useMemo(() => {
    const s = new Set<string>();
    (usageHistoryQuery.data?.dailyHistory ?? []).forEach((day) => {
      Object.keys(day.usageByUnit ?? {}).forEach((unit) => s.add(unit));
    });
    return Array.from(s);
  }, [usageHistoryQuery.data?.dailyHistory]);

  const barData = useMemo(() => {
    return (usageHistoryQuery.data?.dailyHistory ?? []).map((day) => {
      const date = new Date(day.date);
      const row: Record<string, string | number> = {
        day: `${date.getMonth() + 1}/${date.getDate()}`,
      };
      unitKeys.forEach((unit) => {
        row[unit] = day.usageByUnit?.[unit]?.totalCost ?? 0;
      });
      return row;
    });
  }, [unitKeys, usageHistoryQuery.data?.dailyHistory]);

  const usageInsights = usageInsightsQuery.data;
  const totalSpend = usageInsights?.totalSpend ?? 0;
  const totalReq = usageInsights?.totalRequests ?? 0;
  const topModel = usageInsights?.mostUsedModel ?? "—";
  const avgCostPerRequest = usageInsights?.avgCostPerRequest ?? 0;

  return (
    <>
      <UserHeader title="Usage & activity">
        <Select
          value={period}
          onValueChange={(v) => v != null && setPeriod(v)}
        >
          <SelectTrigger className="h-9 w-40 rounded-xl border-zinc-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="15days">Last 15 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="3m">Last 3 months</SelectItem>
            <SelectItem value="6m">Last 6 months</SelectItem>
            <SelectItem value="year">Last 1 year</SelectItem>
          </SelectContent>
        </Select>
      </UserHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total spend"
          value={formatCost(totalSpend)}
          delta={{
            value: percentDelta(usageInsights?.totalSpendChangePercent).label,
            positive: percentDelta(usageInsights?.totalSpendChangePercent).positive,
          }}
        />
        <StatCard
          label="Total requests"
          value={totalReq}
          delta={{
            value: percentDelta(usageInsights?.totalRequestsChangePercent).label,
            positive: percentDelta(usageInsights?.totalRequestsChangePercent).positive,
          }}
        />
        <StatCard label="Most used model" value={topModel} />
        <StatCard
          label="Avg cost / request"
          value={formatCost(avgCostPerRequest)}
          delta={{
            value: percentDelta(usageInsights?.avgCostPerRequestChangePercent).label,
            positive: percentDelta(usageInsights?.avgCostPerRequestChangePercent).positive,
          }}
        />
      </div>

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="mb-3 text-[13px] font-medium text-zinc-500">
          Daily cost breakdown
        </p>
        <div className="mb-3 flex flex-wrap gap-4">
          {unitKeys.map((k) => (
            <span
              key={k}
              className="flex items-center gap-1.5 text-xs text-zinc-500"
            >
              <span
                className="size-2.5 rounded-sm"
                style={{ background: unitTypeColors[k] ?? "#71717a" }}
              />
              {k.replace(/_/g, " ")}
            </span>
          ))}
        </div>
        <div className="min-h-[240px] w-full">
          <UsageStackedBar data={barData} keys={unitKeys} />
        </div>
      </div>

      <div>
        <p className="mb-3 text-[13px] font-medium text-zinc-500 ">
          Activity log
        </p>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          {activityErrored ? (
            <div className="px-4 py-10 text-sm text-red-600">{mapActivityError(activityError)}</div>
          ) : activityLoading ? (
            <div className="space-y-2 px-4 py-4">
              <div className="h-12 animate-pulse rounded-lg bg-zinc-100" />
              <div className="h-12 animate-pulse rounded-lg bg-zinc-100" />
              <div className="h-12 animate-pulse rounded-lg bg-zinc-100" />
            </div>
          ) : (activityPageData?.totalElements ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-zinc-400">
              <FileText className="size-6" />
              <p className="text-sm">No activity recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3 px-4 py-4">
              {(activityPageData?.content ?? []).slice(0, 15).map((entry: UserActivityResponse, idx: number) => {
                const { Icon, className } = getActivityIcon(entry.action);
                const fullTime = formatActivityFull(entry.createdAt);
                return (
                  <div
                    key={`${entry.action}-${entry.createdAt}-${idx}`}
                    className="rounded-xl border border-zinc-100 px-3 py-2"
                    title={formatActivityFull(entry.createdAt)}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm text-zinc-900">{entry.details}</p>
                      </div>
                      <div className="shrink-0">
                        <p className="flex items-center gap-3 whitespace-nowrap text-xs">
                          <span className="break-all text-zinc-500">
                            {entry.ipAddress && entry.ipAddress !== "UNKNOWN"
                              ? `IP: ${entry.ipAddress}`
                              : "IP: unknown"}
                          </span>
                          <span className="text-zinc-400">{fullTime}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activityPageData ? (
            <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-sm">
              <span className="text-zinc-500">Page {activityPageData.number + 1} of {Math.max(activityPageData.totalPages, 1)}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivityPage((p) => Math.max(0, p - 1))}
                  disabled={activityPageData.first}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setActivityPage((p) => p + 1)}
                  disabled={activityPageData.last}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

    </>
  );
}
