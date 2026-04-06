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
  fetchModels,
  fetchTasks,
  getUserActivityRecent,
  type UserActivityResponse,
} from "@/lib/api";
import { mockUsageRecords } from "@/lib/mock-data";
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

export default function UsagePage() {
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const { data: models } = useQuery({ queryKey: ["models"], queryFn: fetchModels });

  const [period, setPeriod] = useState("month");
  const [activityPage, setActivityPage] = useState(0);

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
    mockUsageRecords.forEach((u) => s.add(u.usage_unit_type));
    return Array.from(s);
  }, []);

  const barData = useMemo(() => {
    const days = 14;
    const rows: Record<string, string | number>[] = [];
    for (let d = days - 1; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const day = `${date.getMonth() + 1}/${date.getDate()}`;
      const row: Record<string, string | number> = { day };
      unitKeys.forEach((k) => {
        row[k] = Math.round(
          (Math.sin(d + k.length) + 1) * (k === "INPUT_TOKENS" ? 40 : 25)
        );
      });
      rows.push(row);
    }
    return rows;
  }, [unitKeys]);

  const totalSpend = (tasks ?? []).reduce((a, t) => a + t.total_cost, 0);
  const totalReq = (tasks ?? []).length;
  const topModel =
    models?.find((m) => m.modelId === 1)?.fullname ?? "GPT-4o November 2024";

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
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="last">Last month</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
          </SelectContent>
        </Select>
      </UserHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total spend"
          value={formatCost(totalSpend)}
          delta={{ value: "↑12% vs prior", positive: true }}
        />
        <StatCard
          label="Total requests"
          value={totalReq}
          delta={{ value: "↑4% vs prior", positive: true }}
        />
        <StatCard label="Most used model" value={topModel} />
        <StatCard
          label="Avg cost / request"
          value={formatCost(totalReq ? totalSpend / totalReq : 0)}
          delta={{ value: "↓3% vs prior", positive: false }}
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
            <div className="divide-y divide-zinc-100">
              {(activityPageData?.content ?? []).map((entry: UserActivityResponse, idx: number) => {
                const { Icon, className } = getActivityIcon(entry.action);
                const fullTime = formatActivityFull(entry.createdAt);
                return (
                  <div
                    key={`${entry.action}-${entry.createdAt}-${idx}`}
                    className="px-4 py-3"
                    title={formatActivityFull(entry.createdAt)}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} />
                      <div className="min-w-0">
                        <p className="break-words text-sm text-zinc-900">{entry.details}</p>
                        <p className="mt-1 break-all text-xs text-zinc-500">
                          {entry.ipAddress && entry.ipAddress !== "UNKNOWN"
                            ? `IP: ${entry.ipAddress}`
                            : "IP: unknown location"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">Created at: {fullTime}</p>
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
