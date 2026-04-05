"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { AdminHeader } from "@/components/admin/admin-header";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  adminFetchTaskAnalytics,
  adminFetchTaskInsights,
  adminFetchTaskList,
  type AdminTaskListItemView,
} from "@/lib/admin-api";
import { chartTheme } from "@/lib/charts";
import { ApiRequestError, type AdminTaskStatusFilter } from "@/lib/api";
import { AdminStatCard } from "@/components/admin/stat-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 5;
const STATUS_OPTIONS: AdminTaskStatusFilter[] = [
  "ALL",
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
];

function toApiDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string, endOfDay = false): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatTaskError(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 403) {
      return "You don't have permission to perform this action.";
    }

    if (error.status === 400 && error.message.toLowerCase().includes("invalid status filter")) {
      return "Invalid status. Use: ALL, QUEUED, PROCESSING, COMPLETED, FAILED";
    }

    if (error.status === 400 && error.message.toLowerCase().includes("page must be >= 0")) {
      return "Page must be >= 0 and size must be > 0";
    }

    return error.message || fallback;
  }

  return fallback;
}

function formatProcessingTime(value: number | null): string {
  if (value == null) return "—";
  if (value < 1000) return `${value} ms`;
  if (value < 60000) return `${(value / 1000).toFixed(1)} s`;
  return `${(value / 60000).toFixed(1)} min`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
}

function shortTaskId(taskId: string): string {
  return `${taskId.slice(0, 8)}...`;
}

export default function AdminTasksPage() {
  const now = new Date();
  const initialTo = formatDateInput(now);
  const initialFromDate = new Date(now);
  initialFromDate.setDate(initialFromDate.getDate() - 6);
  const initialFrom = formatDateInput(initialFromDate);

  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [analyticsStatus, setAnalyticsStatus] = useState<AdminTaskStatusFilter>("ALL");

  const [listStatus, setListStatus] = useState<AdminTaskStatusFilter>("ALL");
  const [page, setPage] = useState(1);

  const fromDateObj = useMemo(() => parseInputDate(fromDate, false), [fromDate]);
  const toDateObj = useMemo(() => parseInputDate(toDate, true), [toDate]);
  const rangeValid = !!fromDateObj && !!toDateObj && fromDateObj.getTime() < toDateObj.getTime();
  const rangeError = rangeValid ? "" : "From must be before To";

  const insightsQuery = useQuery({
    queryKey: ["admin-task-insights"],
    queryFn: adminFetchTaskInsights,
  });

  const analyticsQuery = useQuery({
    queryKey: ["admin-task-analytics", fromDate, toDate, analyticsStatus],
    enabled: rangeValid,
    queryFn: () => {
      if (!fromDateObj || !toDateObj) {
        throw new Error("Invalid date range");
      }
      return adminFetchTaskAnalytics({
        from: toApiDateTime(fromDateObj),
        to: toApiDateTime(toDateObj),
        status: analyticsStatus,
      });
    },
  });

  const listQuery = useQuery({
    queryKey: ["admin-task-list", page, PAGE_SIZE, listStatus],
    queryFn: () =>
      adminFetchTaskList({
        page: page - 1,
        size: PAGE_SIZE,
        status: listStatus,
      }),
  });

  const insights = insightsQuery.data;
  const analytics = analyticsQuery.data;
  const listPage = listQuery.data;

  useEffect(() => {
    setPage(1);
  }, [listStatus]);

  const chartData = useMemo(() => {
    if (!rangeValid) return [];
    return (analytics?.dailyAnalytics ?? []).map((item) => ({
      day: item.date,
      COMPLETED: item.completed,
      FAILED: item.failed,
      PROCESSING: item.processing,
      QUEUED: item.queued,
    }));
  }, [analytics, rangeValid]);

  const chartAllZero = useMemo(() => {
    if (!analytics) return false;
    return analytics.dailyAnalytics.every(
      (item) =>
        item.total === 0 &&
        item.completed === 0 &&
        item.failed === 0 &&
        item.processing === 0 &&
        item.queued === 0
    );
  }, [analytics]);

  const listItems = listPage?.tasks ?? [];
  const currentPage = Math.min(page, Math.max(1, listPage?.totalPages ?? 1));
  const totalPages = Math.max(1, listPage?.totalPages ?? 1);
  const totalElements = listPage?.totalElements ?? 0;

  const analyticsError = rangeError
    ? rangeError
    : analyticsQuery.error
      ? formatTaskError(analyticsQuery.error, "Failed to load task analytics.")
      : "";

  const listError = listQuery.error
    ? formatTaskError(listQuery.error, "Failed to load task list. Please try again.")
    : "";

  const completedPercent =
    insights && insights.totalTasks > 0
      ? ((insights.completed / insights.totalTasks) * 100).toFixed(1)
      : "0.0";

  return (
    <div>
      <AdminHeader
        title="Tasks"
        subtitle="Manage task execution, monitor failures, and inspect payloads."
      />

      {insightsQuery.error ? (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formatTaskError(insightsQuery.error, "Failed to load task insights.")}
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl bg-zinc-950 p-5 text-white">
          <p className="mb-1 text-xs text-zinc-400">Total tasks</p>
          <p className="text-2xl font-semibold">
            {insightsQuery.isLoading ? "—" : (insights?.totalTasks ?? 0).toLocaleString()}
          </p>
        </div>
        <AdminStatCard
          label="Completed"
          value={insightsQuery.isLoading ? "—" : (insights?.completed ?? 0).toLocaleString()}
          className="border-emerald-200 bg-emerald-50"
          valueClassName="text-emerald-700"
          delta={{ text: `${completedPercent}% of total`, positive: true }}
        />
        <AdminStatCard
          label="Failed"
          value={insightsQuery.isLoading ? "—" : (insights?.failed ?? 0).toLocaleString()}
          className="border-rose-200 bg-rose-50"
          valueClassName="text-rose-700"
        />
        <AdminStatCard
          label="Processing"
          value={insightsQuery.isLoading ? "—" : (insights?.processing ?? 0).toLocaleString()}
          className="border-blue-200 bg-blue-50"
          valueClassName="text-blue-700"
        />
        <AdminStatCard
          label="Queued"
          value={insightsQuery.isLoading ? "—" : (insights?.queued ?? 0).toLocaleString()}
          className="border-amber-200 bg-amber-50"
          valueClassName="text-amber-700"
        />
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-900">Task analytics</p>
            <p className="mt-1 text-xs text-zinc-500">Daily volume by status for selected range</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wide text-zinc-500">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={`h-8 rounded-lg border px-2 text-xs text-zinc-900 ${rangeError ? "border-red-300" : "border-zinc-200"}`}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wide text-zinc-500">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={`h-8 rounded-lg border px-2 text-xs text-zinc-900 ${rangeError ? "border-red-300" : "border-zinc-200"}`}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wide text-zinc-500">Status</label>
              <Select
                value={analyticsStatus}
                onValueChange={(value) => setAnalyticsStatus(value as AdminTaskStatusFilter)}
              >
                <SelectTrigger className="h-8 w-[140px] rounded-lg border-zinc-200 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "ALL"
                        ? "All"
                        : option.charAt(0) + option.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {analyticsError ? (
          <p className="mb-2 text-xs text-red-600">{analyticsError}</p>
        ) : null}

        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...chartTheme.grid} vertical={false} />
              <XAxis dataKey="day" tick={chartTheme.axis.tick} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
              <YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={chartTheme.tooltip.contentStyle} />
              {analyticsStatus === "ALL" ? (
                <>
                  <Bar dataKey="COMPLETED" stackId="a" fill="#22c55e" />
                  <Bar dataKey="FAILED" stackId="a" fill="#ef4444" />
                  <Bar dataKey="PROCESSING" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="QUEUED" stackId="a" fill="#f59e0b" />
                </>
              ) : (
                <Bar dataKey={analyticsStatus} fill="#09090b" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {analyticsQuery.isLoading ? (
          <p className="mt-3 text-xs text-zinc-500">Loading analytics…</p>
        ) : null}
        {chartAllZero ? (
          <p className="mt-3 text-xs text-zinc-500">No task activity found for this period.</p>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end gap-2 border-b border-zinc-100 px-4 py-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wide text-zinc-500">Status</label>
            <Select
              value={listStatus}
              onValueChange={(value) => {
                setListStatus(value as AdminTaskStatusFilter);
              }}
            >
              <SelectTrigger className="h-8 w-[140px] rounded-lg border-zinc-200 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "ALL"
                      ? "All"
                      : option.charAt(0) + option.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {listError ? (
          <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {listError}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Task</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">API Key</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Model</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Processing</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Created</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Updated</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Completed</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-sm text-zinc-500">
                    Loading tasks…
                  </td>
                </tr>
              ) : listItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-sm text-zinc-500">
                    No tasks found for the selected filter.
                  </td>
                </tr>
              ) : (
                listItems.map((item: AdminTaskListItemView) => (
                  <tr key={item.taskId} className="border-b border-zinc-100 hover:bg-zinc-50/80">
                    <td className="px-4 py-4 align-top font-mono text-xs text-zinc-700" title={item.taskId}>
                      {shortTaskId(item.taskId)}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-zinc-700">
                      {item.apiKeyId == null ? (
                        "—"
                      ) : (
                        <Link href="/admin/api-keys" className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900">
                          #{item.apiKeyId}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-zinc-700">
                      {item.modelId == null ? (
                        "—"
                      ) : (
                        <Link href={`/admin/models/${item.modelId}`} className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900">
                          #{item.modelId}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-zinc-700">
                      {formatProcessingTime(item.processingTimeMs)}
                    </td>
                    <td className="px-4 py-4 align-top text-xs text-zinc-600">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-4 align-top text-xs text-zinc-600">
                      {formatDateTime(item.updatedAt)}
                    </td>
                    <td className="px-4 py-4 align-top text-xs text-zinc-600">
                      {formatDateTime(item.completedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500">
          <span>
            Page {currentPage} of {totalPages} · {totalElements.toLocaleString()} total tasks
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage === 1 || listQuery.isLoading}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={currentPage === totalPages || listQuery.isLoading || Boolean(listPage?.lastPage)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

