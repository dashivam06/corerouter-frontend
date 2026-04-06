"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminFetchDashboardOverview } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { chartTheme } from "@/lib/charts";
import { formatNPR } from "@/lib/formatters";

type ChartRevenuePoint = {
  labelUtc: string;
  today: number;
  yesterday: number;
  sevenDaysAgo: number;
};

function mapErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 403) return "You don't have permission to perform this action.";
    if (error.status === 429) return "Too many requests. Please slow down.";
    if (error.status === 503) return "Service temporarily unavailable. Try again later.";
    if (error.status === 500) return "Something went wrong. Please try again.";
    if (error.status === 0) return "Unable to connect. Check your internet connection.";
    return error.message || fallback;
  }
  return fallback;
}

function formatUtcTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

function formatCompactNpr(value: number): string {
  if (!Number.isFinite(value)) return "NPR 0";
  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
  return `NPR ${compact}`;
}

function ChangeBadge({ percent }: { percent: number }) {
  if (percent > 0) {
    return <p className="mt-2 text-xs text-green-400">▲ {percent.toFixed(1)}% vs last month</p>;
  }
  if (percent < 0) {
    return <p className="mt-2 text-xs text-red-400">▼ {Math.abs(percent).toFixed(1)}% vs last month</p>;
  }
  return <p className="mt-2 text-xs text-zinc-400">Stable</p>;
}

function SectionError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}

export default function AdminDashboardPage() {
  const overviewQuery = useQuery({
    queryKey: ["admin-dashboard-overview"],
    queryFn: adminFetchDashboardOverview,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const overview = overviewQuery.data;
  const currentUtcHour = new Date().getUTCHours();

  const revenueChartData = useMemo<ChartRevenuePoint[]>(() => {
    if (!overview) return [];
    return overview.revenueTrend.today.map((point, idx) => ({
      labelUtc: point.labelUtc,
      today: point.value,
      yesterday: overview.revenueTrend.yesterday[idx]?.value ?? 0,
      sevenDaysAgo: overview.revenueTrend.sevenDaysAgo[idx]?.value ?? 0,
    }));
  }, [overview]);

  const updatedAtText = formatUtcTime(
    overviewQuery.dataUpdatedAt ? new Date(overviewQuery.dataUpdatedAt) : new Date()
  );
  const dashboardError = overviewQuery.isError
    ? mapErrorMessage(overviewQuery.error, "Failed to load dashboard. Please try again.")
    : null;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-950">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Overview of admin revenue and activity (UTC).</p>
          <p className="mt-1 text-xs text-zinc-400">Last updated: {updatedAtText} UTC</p>
        </div>
        <button
          type="button"
          onClick={() => overviewQuery.refetch()}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          aria-label="Refresh dashboard"
        >
          <RefreshCw className={`size-4 ${overviewQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-zinc-950 p-5 text-white">
          <p className="text-xs text-zinc-400">Total Earnings (All Time)</p>
          <p className="mt-1 text-[28px] font-semibold">{formatNPR(overview?.totalEarnings ?? 0)}</p>
          {overview ? <ChangeBadge percent={overview.totalEarningsChangeFromPastMonthPercent} /> : null}
          {!overview && dashboardError ? <p className="mt-2 text-xs text-red-300">{dashboardError}</p> : null}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-1 text-xs text-zinc-500">Today&apos;s Revenue</p>
          <p className="text-2xl font-semibold text-zinc-950">{formatNPR(overview?.todayEarning ?? 0)}</p>
          <p className="mt-1 text-xs text-zinc-400">UTC date</p>
          {!overview && dashboardError ? <p className="mt-2 text-xs text-red-500">{dashboardError}</p> : null}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-1 text-xs text-zinc-500">Tasks Processed Today</p>
          <p className="text-2xl font-semibold text-zinc-950">{overview?.tasksProcessedToday ?? 0}</p>
          <p className="mt-1 text-xs text-zinc-400">Completed tasks (UTC)</p>
          {!overview && dashboardError ? <p className="mt-2 text-xs text-red-500">{dashboardError}</p> : null}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-1 text-xs text-zinc-500">Active Users Today</p>
          <p className="text-2xl font-semibold text-zinc-950">{overview?.activeUsersToday ?? 0}</p>
          <p className="mt-1 text-xs text-zinc-400">Distinct users with tasks (UTC)</p>
          {!overview && dashboardError ? <p className="mt-2 text-xs text-red-500">{dashboardError}</p> : null}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-zinc-950">Task Volume - Last 24 Hours (UTC)</p>
          {overview ? (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.taskVolume24h} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...chartTheme.grid} vertical={false} />
                  <XAxis dataKey="labelUtc" tick={chartTheme.axis.tick} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
                  <YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} width={44} />
                  <Tooltip contentStyle={chartTheme.tooltip.contentStyle} formatter={(value: number) => [value, "tasks"]} />
                  <Bar dataKey="value">
                    {overview.taskVolume24h.map((row) => (
                      <Cell key={row.hour} fill={row.hour === currentUtcHour ? "#09090b" : "#d4d4d8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : dashboardError ? (
            <SectionError message={dashboardError} />
          ) : (
            <div className="h-[220px] animate-pulse rounded-xl bg-zinc-100" />
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-zinc-950">Hourly Revenue Trend (UTC)</p>
          <div className="mb-3 flex gap-4">
            <span className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="h-2.5 w-2.5 rounded-sm bg-zinc-900" />Today
            </span>
            <span className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="h-2.5 w-2.5 rounded-sm bg-zinc-500" />Yesterday
            </span>
            <span className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="h-2.5 w-2.5 rounded-sm bg-zinc-300" />7 Days Ago
            </span>
          </div>
          {overview ? (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...chartTheme.grid} vertical={false} />
                  <XAxis dataKey="labelUtc" tick={chartTheme.axis.tick} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
                  <YAxis
                    tick={chartTheme.axis.tick}
                    axisLine={false}
                    tickLine={false}
                    width={70}
                    tickFormatter={(v) => formatCompactNpr(Number(v))}
                  />
                  <Tooltip contentStyle={chartTheme.tooltip.contentStyle} formatter={(v: number) => formatNPR(v)} />
                  <Line type="monotone" dataKey="today" stroke="#09090b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="yesterday" stroke="#71717a" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                  <Line type="monotone" dataKey="sevenDaysAgo" stroke="#a1a1aa" strokeWidth={1.5} strokeDasharray="2 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : dashboardError ? (
            <SectionError message={dashboardError} />
          ) : (
            <div className="h-[220px] animate-pulse rounded-xl bg-zinc-100" />
          )}
        </div>
      </div>

      <div>
        <p className="mb-4 text-[15px] font-semibold text-zinc-950">Recent Activity</p>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          {overview ? (
            <div className="space-y-3">
              {overview.recentActivity.length === 0 ? (
                <p className="text-sm text-zinc-500">No recent activity.</p>
              ) : (
                overview.recentActivity.map((item, idx) => {
                  const taskId = item.split("·")[1]?.trim() ?? "";
                  const shortTaskId = taskId ? `${taskId.slice(0, 8)}...` : "-";
                  return (
                    <div key={`${item}-${idx}`} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm text-zinc-700">
                        <span className="inline-block size-2 rounded-full bg-green-500" />
                        <span>Task completed · {shortTaskId}</span>
                      </div>
                      {taskId ? (
                        <a href="/admin/tasks" className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-900">
                          View
                        </a>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          ) : dashboardError ? (
            <SectionError message={dashboardError} />
          ) : (
            <div className="space-y-2">
              <div className="h-10 animate-pulse rounded-xl bg-zinc-100" />
              <div className="h-10 animate-pulse rounded-xl bg-zinc-100" />
              <div className="h-10 animate-pulse rounded-xl bg-zinc-100" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
