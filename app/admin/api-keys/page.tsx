"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  adminFetchApiKeys,
  adminFetchUsers,
} from "@/lib/admin-api";
import { formatRelative } from "@/lib/formatters";
import { chartTheme } from "@/lib/charts";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminStatCard } from "@/components/admin/stat-card";
import { MaskedKey } from "@/components/shared/masked-key";
import type { AdminApiKey } from "@/lib/admin-mock-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const API_KEY_STATUSES = ["ACTIVE", "INACTIVE", "REVOKED"] as const;

type PendingApiKeyStatusChange = {
  apiKeyId: number;
  from: AdminApiKey["status"];
  to: AdminApiKey["status"];
};

export default function AdminApiKeysPage() {
  const { data: keys } = useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: adminFetchApiKeys,
  });
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminFetchUsers,
  });

  const list = keys ?? [];
  const userList = users ?? [];

  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE" | "REVOKED">("ALL");
  const [q, setQ] = useState("");
  const [statusRange, setStatusRange] = useState("30d");
  const [seriesRange, setSeriesRange] = useState("6m");
  const [statusOverrides, setStatusOverrides] = useState<Record<number, AdminApiKey["status"]>>({});
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingApiKeyStatusChange | null>(null);

  const getKeyStatus = (k: AdminApiKey) => statusOverrides[k.api_key_id] ?? k.status;

  const pendingApiKey = useMemo(
    () => list.find((k) => k.api_key_id === pendingStatusChange?.apiKeyId) ?? null,
    [list, pendingStatusChange]
  );

  function applyPendingStatusChange() {
    if (!pendingStatusChange) return;
    setStatusOverrides((prev) => ({
      ...prev,
      [pendingStatusChange.apiKeyId]: pendingStatusChange.to,
    }));
    setPendingStatusChange(null);
  }

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const pastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const keysThisMonth = list.filter(
      (k) => new Date(k.created_at).getTime() >= monthStart.getTime()
    ).length;
    const keysPastMonth = list.filter((k) => {
      const createdTs = new Date(k.created_at).getTime();
      return createdTs >= pastMonthStart.getTime() && createdTs < monthStart.getTime();
    }).length;

    const deltaFromPastMonth =
      keysPastMonth > 0
        ? ((keysThisMonth - keysPastMonth) / keysPastMonth) * 100
        : 0;

    return {
      total: list.length,
      active: list.filter((k) => getKeyStatus(k) === "ACTIVE").length,
      inactive: list.filter((k) => getKeyStatus(k) === "INACTIVE").length,
      revoked: list.filter((k) => getKeyStatus(k) === "REVOKED").length,
      deltaFromPastMonth,
    };
  }, [list, statusOverrides]);

  const filtered = useMemo(() => {
    let out = list;
    if (status !== "ALL") out = out.filter((k) => getKeyStatus(k) === status);
    const s = q.trim().toLowerCase();
    if (s) {
      out = out.filter(
        (k) => {
          const u = owner(k.user_id);
          const username = u?.email?.split("@")[0]?.toLowerCase() ?? "";
          return (
            k.description.toLowerCase().includes(s) ||
            k.key.toLowerCase().includes(s) ||
            String(k.api_key_id).includes(s) ||
            (u?.full_name ?? "").toLowerCase().includes(s) ||
            (u?.email ?? "").toLowerCase().includes(s) ||
            username.includes(s)
          );
        }
      );
    }
    return out;
  }, [list, status, q, statusOverrides]);

  const PAGE_SIZE = 5;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [status, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedKeys = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  function owner(uId: number | null | undefined) {
    if (!uId) return null;
    return userList.find((u) => u.user_id === uId) ?? null;
  }

  const dummySeries = useMemo(() => {
    // last 6 months mock counts
    return Array.from({ length: 6 }, (_, i) => ({
      m: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][i] ?? `M${i + 1}`,
      created: 10 + i * 3,
      revoked: 2 + (i % 3),
    }));
  }, []);

  const statusPieData = [
    { name: "Active", value: stats.active, color: "#22c55e" },
    { name: "Inactive", value: stats.inactive, color: "#d4d4d8" },
    { name: "Revoked", value: stats.revoked, color: "#ef4444" },
  ];

  return (
    <div>
      <AdminHeader
        title="API Keys"
        subtitle="Monitor keys, revoke access, and review usage patterns."
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-zinc-950 p-5 text-white">
          <p className="text-xs text-zinc-400">Total Keys</p>
          <p className="mt-1 text-[28px] font-semibold">{stats.total}</p>
          <p className={`mt-2 text-xs ${stats.deltaFromPastMonth >= 0 ? "text-green-400" : "text-red-400"}`}>
            {stats.deltaFromPastMonth >= 0 ? "↑" : "↓"} {Math.abs(stats.deltaFromPastMonth).toFixed(1)}% from past month
          </p>
        </div>
        <AdminStatCard label="Active" value={stats.active} />
        <AdminStatCard label="Inactive" value={stats.inactive} />
        <AdminStatCard label="Revoked" value={stats.revoked} />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 lg:col-span-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-950">
              Keys created vs revoked
            </p>
            <Select value={seriesRange} onValueChange={(v) => v != null && setSeriesRange(v)}>
              <SelectTrigger className="h-8 w-[130px] rounded-lg border-zinc-200 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dummySeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...chartTheme.grid} vertical={false} />
                <XAxis dataKey="m" tick={chartTheme.axis.tick} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
                <YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={chartTheme.tooltip.contentStyle} />
                <Bar dataKey="created" fill="#09090b" />
                <Bar dataKey="revoked" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-950">
              Status distribution
            </p>
            <Select value={statusRange} onValueChange={(v) => v != null && setStatusRange(v)}>
              <SelectTrigger className="h-8 w-[130px] rounded-lg border-zinc-200 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={74}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {statusPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTheme.tooltip.contentStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-600">
            {statusPieData.map((entry) => (
              <span key={entry.name} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}: {entry.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-3">
          {(["ALL", "ACTIVE", "INACTIVE", "REVOKED"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs ${
                status === s
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-500 hover:bg-zinc-100"
              }`}
              onClick={() => setStatus(s)}
            >
              {s === "ALL" ? "All" : s[0] + s.slice(1).toLowerCase()}
            </button>
          ))}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search username, API key, or description..."
            className="ml-auto w-60 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-100">
            <tr>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">User</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">Key</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">Status</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500 text-right">Limits</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">Last used</th>
            </tr>
          </thead>
          <tbody>
            {paginatedKeys.map((k) => {
              const u = owner(k.user_id);
              return (
                <tr
                  key={k.api_key_id}
                  className="border-b border-zinc-100 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-zinc-900">
                      {u?.full_name ?? "—"}
                    </div>
                    <div className="text-xs text-zinc-400">{u?.email ?? ""}</div>
                  </td>
                  <td className="px-4 py-3">
                    <MaskedKey fullKey={k.key} />
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={getKeyStatus(k)}
                      onValueChange={(value) => {
                        const nextStatus = value as AdminApiKey["status"];
                        const currentStatus = getKeyStatus(k);
                        if (nextStatus === currentStatus) return;
                        setPendingStatusChange({
                          apiKeyId: k.api_key_id,
                          from: currentStatus,
                          to: nextStatus,
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 w-[130px] rounded-lg border-zinc-200 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {API_KEY_STATUSES.map((statusValue) => (
                          <SelectItem key={statusValue} value={statusValue}>
                            {statusValue}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-500">
                    D: {k.daily_used}/{k.daily_limit} · M: {k.monthly_used}/{k.monthly_limit}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {k.last_used_at ? formatRelative(new Date(k.last_used_at)) : "Never"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-zinc-400">
                  No keys match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500">
          <span>
            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <AlertDialog
        open={pendingStatusChange != null}
        onOpenChange={(open) => {
          if (!open) setPendingStatusChange(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl border border-zinc-200 p-0">
          <AlertDialogHeader className="items-start px-4 pt-4 text-left">
            <AlertDialogTitle>Confirm API key status update</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusChange
                ? `Review the status change for key #${pendingStatusChange.apiKeyId}${pendingApiKey ? ` (${pendingApiKey.description})` : ""}. This will update the key state immediately.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingStatusChange ? (
            <div className="relative mx-4 my-3 rounded-xl border border-zinc-200 bg-zinc-50 py-5 px-3 text-xs">
              <span className="absolute -top-2 left-3 bg-zinc-50 px-1 text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                Change summary
              </span>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-zinc-500">Current</span>
                  <span className="inline-flex rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700">
                    {pendingStatusChange.from}
                  </span>
                </div>
                <div className="h-4 w-px bg-zinc-200" />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-zinc-700">New</span>
                  <span className="inline-flex rounded-md border border-zinc-900 bg-zinc-950 px-2.5 py-1 text-sm font-semibold text-white">
                    {pendingStatusChange.to}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
          <AlertDialogFooter className="!mx-0 !mb-0 rounded-b-2xl border-zinc-100 bg-zinc-50 px-4 py-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-zinc-950 text-white hover:bg-zinc-900"
              onClick={applyPendingStatusChange}
            >
              Yes, update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

