"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminStatCard } from "@/components/admin/stat-card";
import { formatRelative } from "@/lib/formatters";
import { chartTheme } from "@/lib/charts";
import {
  adminFetchApiKeyAnalytics,
  adminFetchApiKeyInsights,
  adminFetchApiKeysPage,
  adminUpdateApiKeyStatus,
  type AdminApiKeyListItemView,
} from "@/lib/admin-api";
import { ApiRequestError, type AdminApiKeyAnalyticsItem, type AdminApiKeyStatus } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 5;
const API_KEY_FILTER_STATUSES: Array<"ALL" | AdminApiKeyStatus> = ["ALL", "ACTIVE", "INACTIVE", "REVOKED"];
const API_KEY_CHANGE_STATUSES: AdminApiKeyStatus[] = ["ACTIVE", "INACTIVE", "REVOKED"];
const ANALYTICS_RANGES = ["7d", "30d", "6m", "1y"] as const;

type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 403) {
      return "You don't have permission to perform this action.";
    }

    return error.message || "Unable to load API keys right now.";
  }

  return "Unable to load API keys right now. Please try again.";
}

function toApiDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function getRangeBounds(range: AnalyticsRange): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 0);

  const from = new Date(to);
  if (range === "7d") {
    from.setDate(from.getDate() - 6);
  } else if (range === "30d") {
    from.setDate(from.getDate() - 29);
  } else if (range === "6m") {
    from.setMonth(from.getMonth() - 5, 1);
  } else {
    from.setMonth(from.getMonth() - 11, 1);
  }

  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function getCurrentMonthBounds(): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 0);

  const from = new Date(to.getFullYear(), to.getMonth(), 1);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeAnalyticsItem(item: AdminApiKeyAnalyticsItem) {
  return {
    date: item.date,
    revoked: item.revoked ?? 0,
    active: item.active ?? 0,
  };
}

function buildApiKeySeriesFromList(range: AnalyticsRange, items: AdminApiKeyListItemView[]) {
  const rangeBounds = getRangeBounds(range);
  const bucketMap = new Map<string, { active: number; revoked: number }>();

  for (const item of items) {
    const createdAt = asDate(item.createdAt);
    if (!createdAt) continue;
    if (createdAt.getTime() < rangeBounds.from.getTime() || createdAt.getTime() > rangeBounds.to.getTime()) continue;

    const bucketKey = range === "7d" || range === "30d" ? toDateKey(createdAt) : toMonthKey(createdAt);
    const current = bucketMap.get(bucketKey) ?? { active: 0, revoked: 0 };
    if (item.status === "ACTIVE") current.active += 1;
    if (item.status === "REVOKED") current.revoked += 1;
    bucketMap.set(bucketKey, current);
  }

  if (range === "7d" || range === "30d") {
    const rows: Array<{ label: string; active: number; revoked: number }> = [];
    for (
      let cursor = new Date(rangeBounds.from);
      cursor.getTime() <= rangeBounds.to.getTime();
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const key = toDateKey(cursor);
      const bucket = bucketMap.get(key) ?? { active: 0, revoked: 0 };
      rows.push({
        label: cursor.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        active: bucket.active,
        revoked: bucket.revoked,
      });
    }

    return rows;
  }

  const rows: Array<{ label: string; active: number; revoked: number }> = [];
  for (
    let cursor = new Date(rangeBounds.from.getFullYear(), rangeBounds.from.getMonth(), 1);
    cursor.getTime() <= rangeBounds.to.getTime();
    cursor.setMonth(cursor.getMonth() + 1)
  ) {
    const key = toMonthKey(cursor);
    const bucket = bucketMap.get(key) ?? { active: 0, revoked: 0 };
    rows.push({
      label: cursor.toLocaleDateString(undefined, { month: "short" }),
      active: bucket.active,
      revoked: bucket.revoked,
    });
  }

  return rows;
}

function buildAnalyticsSeries(range: AnalyticsRange, items: AdminApiKeyAnalyticsItem[]) {
  const rangeBounds = getRangeBounds(range);
  const dailyMap = new Map<string, ReturnType<typeof normalizeAnalyticsItem>>();

  for (const item of items.map(normalizeAnalyticsItem)) {
    dailyMap.set(item.date, item);
  }

  const filledDaily: ReturnType<typeof normalizeAnalyticsItem>[] = [];
  for (
    let cursor = new Date(rangeBounds.from);
    cursor.getTime() <= rangeBounds.to.getTime();
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const key = toDateKey(cursor);
    filledDaily.push(
      dailyMap.get(key) ?? {
        date: key,
        revoked: 0,
        active: 0,
      }
    );
  }

  if (range === "7d" || range === "30d") {
    return filledDaily.map((item) => ({
      label: new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      revoked: item.revoked,
      active: item.active,
    }));
  }

  const grouped = new Map<string, { labelDate: Date; revoked: number; active: number }>();
  for (const item of filledDaily) {
    const date = new Date(`${item.date}T00:00:00`);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = grouped.get(key) ?? {
      labelDate: new Date(date.getFullYear(), date.getMonth(), 1),
      revoked: 0,
      active: 0,
    };
    existing.revoked += item.revoked;
    existing.active += item.active;
    grouped.set(key, existing);
  }

  return Array.from(grouped.values())
    .sort((left, right) => left.labelDate.getTime() - right.labelDate.getTime())
    .map((item) => ({
      label: item.labelDate.toLocaleDateString(undefined, { month: "short" }),
      revoked: item.revoked,
      active: item.active,
    }));
}

function statusClass(status: AdminApiKeyStatus) {
  if (status === "ACTIVE") return "border-green-200 bg-green-50 text-green-700";
  if (status === "INACTIVE") return "border-zinc-200 bg-zinc-100 text-zinc-600";
  return "border-red-200 bg-red-50 text-red-700";
}

function maskedAdminKey() {
  return "cr_live_••••••••";
}

function getOwnerLabel(item: AdminApiKeyListItemView) {
  if (item.userName) return item.userName;
  if (item.userEmail) return item.userEmail;
  return "Unknown user";
}

function getOwnerSubLabel(item: AdminApiKeyListItemView) {
  if (item.userEmail && item.userName && item.userEmail !== item.userName) {
    return item.userEmail;
  }

  return item.userId != null ? `User #${item.userId}` : "No linked user";
}

export default function AdminApiKeysPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"ALL" | AdminApiKeyStatus>("ALL");
  const [statusChangeContext, setStatusChangeContext] = useState<{ apiKeyId: number; owner: string } | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("7d");
  const [page, setPage] = useState(1);
  const [statusOverrides, setStatusOverrides] = useState<Record<number, AdminApiKeyStatus>>({});
  const [updatingApiKeyId, setUpdatingApiKeyId] = useState<number | null>(null);
  const [statusError, setStatusError] = useState("");

  const rangeBounds = useMemo(() => getRangeBounds(analyticsRange), [analyticsRange]);

  const insightsQuery = useQuery({
    queryKey: ["admin-api-key-insights"],
    queryFn: adminFetchApiKeyInsights,
  });

  const analyticsQuery = useQuery({
    queryKey: ["admin-api-key-analytics", analyticsRange],
    queryFn: () =>
      adminFetchApiKeyAnalytics(
        toApiDateTime(rangeBounds.from),
        toApiDateTime(rangeBounds.to)
      ),
  });

  const monthBounds = useMemo(() => getCurrentMonthBounds(), []);

  const monthAnalyticsQuery = useQuery({
    queryKey: ["admin-api-key-month-analytics"],
    queryFn: () =>
      adminFetchApiKeyAnalytics(
        toApiDateTime(monthBounds.from),
        toApiDateTime(monthBounds.to)
      ),
  });

  const keysQuery = useQuery({
    queryKey: ["admin-api-key-list", page, statusFilter],
    queryFn: () =>
      adminFetchApiKeysPage({
        page: page - 1,
        size: PAGE_SIZE,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      }),
  });

  const allKeysQuery = useQuery({
    queryKey: ["admin-api-key-all-list"],
    queryFn: () =>
      adminFetchApiKeysPage({
        page: 0,
        size: 1000,
      }),
  });

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (!keysQuery.data) return;
    if (keysQuery.data.totalPages > 0 && page > keysQuery.data.totalPages) {
      setPage(keysQuery.data.totalPages);
    }
  }, [keysQuery.data, page]);

  const insights = insightsQuery.data;
  const analytics = analyticsQuery.data;
  const keysPage = keysQuery.data;
  const allKeys = allKeysQuery.data?.apiKeys ?? [];

  const chartData = useMemo(
    () => buildApiKeySeriesFromList(analyticsRange, allKeys),
    [analyticsRange, allKeys]
  );

  const statusSummary = useMemo(
    () => [
      { name: "ACTIVE", value: insights?.activeKeys ?? 0, color: "#22c55e" },
      { name: "INACTIVE", value: insights?.inactiveKeys ?? 0, color: "#a1a1aa" },
      { name: "REVOKED", value: insights?.revokedKeys ?? 0, color: "#ef4444" },
    ],
    [insights]
  );

  const totalPages = Math.max(1, keysPage?.totalPages ?? 1);
  const currentPage = Math.min(page, totalPages);
  const pageItems = keysPage?.apiKeys ?? [];
  const totalKeys = asNumber(insights?.totalKeys);
  const activeKeys = asNumber(insights?.activeKeys);
  const inactiveKeys = asNumber(insights?.inactiveKeys);
  const revokedKeys = asNumber(insights?.revokedKeys);
  const createdThisMonth = asNumber(monthAnalyticsQuery.data?.totalCreated);
  const createdThisMonthFromList = allKeys.filter((item) => {
    const createdAt = asDate(item.createdAt);
    if (!createdAt) return false;
    return createdAt.getTime() >= monthBounds.from.getTime() && createdAt.getTime() <= monthBounds.to.getTime();
  }).length;
  const createdThisMonthValue = Math.max(createdThisMonth, createdThisMonthFromList);

  const getKeyStatus = (item: AdminApiKeyListItemView) => statusOverrides[item.apiKeyId] ?? item.status;

  async function handleStatusChange(item: AdminApiKeyListItemView, nextStatus: AdminApiKeyStatus) {
    const currentStatus = getKeyStatus(item);
    if (nextStatus === currentStatus) {
      return;
    }

    setStatusError("");
    setUpdatingApiKeyId(item.apiKeyId);
    setStatusChangeContext({ apiKeyId: item.apiKeyId, owner: getOwnerLabel(item) });
    setStatusOverrides((prev) => ({
      ...prev,
      [item.apiKeyId]: nextStatus,
    }));

    try {
      await adminUpdateApiKeyStatus(item.apiKeyId, nextStatus);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-api-key-list"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-api-key-all-list"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-api-key-insights"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-api-key-month-analytics"] }),
      ]);
    } catch (error) {
      setStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[item.apiKeyId];
        return next;
      });
      const ownerInfo = statusChangeContext ? ` for ${statusChangeContext.owner}` : "";
      setStatusError(formatError(error) + ownerInfo);
    } finally {
      setUpdatingApiKeyId(null);
      setStatusChangeContext(null);
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="API Keys"
        subtitle="Review key inventory, usage trends, and access state across the platform."
      />

      {insightsQuery.error || analyticsQuery.error || monthAnalyticsQuery.error || keysQuery.error || allKeysQuery.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formatError(insightsQuery.error ?? analyticsQuery.error ?? monthAnalyticsQuery.error ?? keysQuery.error ?? allKeysQuery.error)}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Total keys"
          value={insightsQuery.isLoading ? "—" : totalKeys.toLocaleString()}
          className="bg-zinc-950 text-white"
          labelClassName="text-zinc-400"
          valueClassName="text-white"
          delta={
            insightsQuery.isLoading
              ? {
                  text: "Loading key metrics...",
                  positive: true,
                }
              : {
                  text: `Created this month: ${createdThisMonthValue.toLocaleString()}`,
                  positive: true,
                }
          }
        />
        <AdminStatCard
          label="Active"
          value={insightsQuery.isLoading ? "—" : activeKeys.toLocaleString()}
        />
        <AdminStatCard
          label="Inactive"
          value={insightsQuery.isLoading ? "—" : inactiveKeys.toLocaleString()}
        />
        <AdminStatCard
          label="Revoked"
          value={insightsQuery.isLoading ? "—" : revokedKeys.toLocaleString()}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-950">Key activity</h2>
              <p className="text-xs text-zinc-500">Active and revoked keys for the selected range.</p>
            </div>
            <Select value={analyticsRange} onValueChange={(value) => setAnalyticsRange(value as AnalyticsRange)}>
              <SelectTrigger className="h-9 w-[150px] rounded-xl border-zinc-200 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="1y">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
              <BarChart
                data={chartData}
                margin={{ top: 6, right: 8, left: -10, bottom: 0 }}
                barCategoryGap="10%"
                barGap={2}
                barSize={analyticsRange === "30d" ? 20 : 30}
              >
                <CartesianGrid {...chartTheme.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={chartTheme.axis.tick}
                  axisLine={{ stroke: "#e4e4e7" }}
                  tickLine={false}
                  interval={analyticsRange === "30d" ? 2 : 0}
                  minTickGap={analyticsRange === "30d" ? 18 : 8}
                  tickMargin={10}
                />
                <YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={chartTheme.tooltip.contentStyle} />
                <Bar dataKey="revoked" name="Revoked" fill="#dc2626" radius={0} minPointSize={4} />
                <Bar dataKey="active" name="Active" fill="#09090b" radius={0} minPointSize={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm xl:col-span-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-zinc-950">Status distribution</h2>
            {/* <p className="text-xs text-zinc-500">Live counts from the admin insights endpoint.</p> */}
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
              <PieChart>
                <Pie
                  data={statusSummary}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {statusSummary.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTheme.tooltip.contentStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-600">
            {statusSummary.map((entry) => (
              <span key={entry.name} className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                {entry.name}: {entry.value.toLocaleString()}
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {API_KEY_FILTER_STATUSES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === value
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-500 hover:bg-zinc-100"
                }`}
              >
                {value === "ALL" ? "All" : value[0] + value.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="ml-auto text-xs text-zinc-500">
            {keysQuery.isFetching ? "Refreshing…" : `Showing ${pageItems.length} of ${keysPage?.totalElements ?? 0}`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Owner</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Key</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Usage</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Last used</th>
              </tr>
            </thead>
            <tbody>
              {keysQuery.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-sm text-zinc-500">
                    Loading API keys…
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-sm text-zinc-500">
                    No API keys match the current filter.
                  </td>
                </tr>
              ) : (
                pageItems.map((item: AdminApiKeyListItemView) => (
                  (() => {
                    const dailyUsed = asNumber(item.dailyUsed);
                    const dailyLimit = asNumber(item.dailyLimit);
                    const monthlyUsed = asNumber(item.monthlyUsed);
                    const monthlyLimit = asNumber(item.monthlyLimit);
                    const lastUsedAt = asDate(item.lastUsedAt);
                    const currentStatus = getKeyStatus(item);

                    return (
                      <tr key={item.apiKeyId} className="border-b border-zinc-100 hover:bg-zinc-50/80">
                        <td className="px-4 py-4 align-top">
                          <div className="font-medium text-zinc-950">{getOwnerLabel(item)}</div>
                          <div className="text-xs text-zinc-400">{getOwnerSubLabel(item)}</div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="font-mono text-sm text-zinc-900">{maskedAdminKey()}</div>
                          <div className="mt-1 text-xs text-zinc-400">{item.description || "No description"}</div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Select
                            value={currentStatus}
                            onValueChange={(value) => void handleStatusChange(item, value as AdminApiKeyStatus)}
                          >
                            <SelectTrigger
                              className={`h-8 w-[130px] rounded-lg border-zinc-200 text-xs ${statusClass(currentStatus)}`}
                              disabled={updatingApiKeyId === item.apiKeyId}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {API_KEY_CHANGE_STATUSES.map((statusValue) => (
                                <SelectItem key={statusValue} value={statusValue}>
                                  {statusValue}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-4 align-top text-xs text-zinc-600">
                          <div>D {dailyUsed.toLocaleString()} / {dailyLimit.toLocaleString()}</div>
                          <div className="mt-1">M {monthlyUsed.toLocaleString()} / {monthlyLimit.toLocaleString()}</div>
                        </td>
                        <td className="px-4 py-4 align-top text-xs text-zinc-500">
                          {lastUsedAt ? formatRelative(lastUsedAt) : "Never"}
                        </td>
                      </tr>
                    );
                  })()
                ))
              )}
            </tbody>
          </table>
        </div>

        {statusError ? (
          <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {statusError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500">
          <span>
            {keysPage ? (
              <>
                Page {currentPage} of {totalPages} · {keysPage.totalElements.toLocaleString()} total keys
              </>
            ) : (
              "Loading key inventory…"
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage === 1 || keysQuery.isLoading}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={currentPage === totalPages || keysQuery.isLoading}
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

