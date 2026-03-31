"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Clock,
  Hash,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { AdminHeader } from "@/components/admin/admin-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { MaskedKey } from "@/components/shared/masked-key";
import { adminFetchApiKeys, adminFetchModels, adminFetchTasks, adminFetchUsers } from "@/lib/admin-api";
import { formatDuration, formatRelative, formatNPR } from "@/lib/formatters";
import type { AdminTask } from "@/lib/admin-mock-data";
import { AdminDetailDrawer } from "@/components/admin/detail-drawer";
import { AdminStatCard } from "@/components/admin/stat-card";
import { chartTheme } from "@/lib/charts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminTasksPage() {
  const { data: tasks } = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: adminFetchTasks,
  });
  const { data: models } = useQuery({
    queryKey: ["admin-models"],
    queryFn: adminFetchModels,
  });
  const { data: apiKeys } = useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: adminFetchApiKeys,
  });
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminFetchUsers,
  });

  const list = tasks ?? [];
  const modelList = models ?? [];
  const keyList = apiKeys ?? [];
  const userList = users ?? [];

  const [status, setStatus] = useState<"ALL" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED">("ALL");
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [processingRange, setProcessingRange] = useState<"24h" | "7d" | "30d">("24h");

  const filtered = useMemo(() => {
    if (status === "ALL") return list;
    return list.filter((t) => t.status === status);
  }, [list, status]);

  const selected = useMemo(
    () => list.find((t) => t.task_id === drawerTaskId) ?? null,
    [list, drawerTaskId]
  );

  const counts = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const pastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthTotal = list.filter(
      (t) => new Date(t.created_at).getTime() >= monthStart.getTime()
    ).length;
    const pastMonthTotal = list.filter((t) => {
      const ts = new Date(t.created_at).getTime();
      return ts >= pastMonthStart.getTime() && ts < monthStart.getTime();
    }).length;

    const totalDeltaPercent =
      pastMonthTotal > 0
        ? ((thisMonthTotal - pastMonthTotal) / pastMonthTotal) * 100
        : 0;

    return {
      total: list.length,
      completed: list.filter((t) => t.status === "COMPLETED").length,
      failed: list.filter((t) => t.status === "FAILED").length,
      processing: list.filter((t) => t.status === "PROCESSING").length,
      queued: list.filter((t) => t.status === "QUEUED").length,
      totalDeltaPercent,
    };
  }, [list]);

  // Mock stacked bar series for last 14 days
  const chartData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      day: `D-${13 - i}`,
      COMPLETED: Math.max(0, 20 + i * 2),
      FAILED: i % 5 === 0 ? 2 : 0,
      PROCESSING: i % 3 === 0 ? 4 : 0,
      QUEUED: i % 4 === 0 ? 3 : 0,
    }));
  }, []);

  const avgProcessingData = useMemo(() => {
    const base = processingRange === "24h" ? 1 : processingRange === "7d" ? 0.92 : 1.05;
    return [
      { name: "LLM", value: Math.round(820 * base) },
      { name: "OCR", value: Math.round(640 * base) },
      { name: "Other", value: Math.round(760 * base) },
    ];
  }, [processingRange]);

  return (
    <div>
      <AdminHeader
        title="Tasks"
        subtitle="Manage task execution, monitor failures, and inspect payloads."
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl bg-zinc-950 p-5 text-white">
          <p className="mb-1 text-xs text-zinc-400">Total tasks</p>
          <p className="text-2xl font-semibold">{counts.total}</p>
          <p className={`mt-1 text-xs ${counts.totalDeltaPercent >= 0 ? "text-green-400" : "text-red-400"}`}>
            {counts.totalDeltaPercent >= 0 ? "↑" : "↓"} {Math.abs(counts.totalDeltaPercent).toFixed(1)}% vs past month
          </p>
        </div>
        <AdminStatCard
          label="Completed"
          value={counts.completed}
          className="border-emerald-200 bg-emerald-50"
          valueClassName="text-emerald-700"
        />
        <AdminStatCard
          label="Failed"
          value={counts.failed}
          className="border-rose-200 bg-rose-50"
          valueClassName="text-rose-700"
        />
        <AdminStatCard
          label="Processing"
          value={counts.processing}
          className="border-amber-200 bg-amber-50"
          valueClassName="text-amber-700"
        />
        <AdminStatCard
          label="Queued"
          value={counts.queued}
          className="border-sky-200 bg-sky-50"
          valueClassName="text-sky-700"
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-3 text-sm font-medium text-zinc-500">
            Task volume by status, last 14 days
          </p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...chartTheme.grid} vertical={false} />
                <XAxis dataKey="day" tick={false} />
                <YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={chartTheme.tooltip.contentStyle} />
                <Bar dataKey="COMPLETED" stackId="a" fill="#22c55e" />
                <Bar dataKey="FAILED" stackId="a" fill="#ef4444" />
                <Bar dataKey="PROCESSING" stackId="a" fill="#f59e0b" />
                <Bar dataKey="QUEUED" stackId="a" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-950">
              Avg processing time per model (mock)
            </p>
            <Select
              value={processingRange}
              onValueChange={(v) =>
                v === "24h" || v === "7d" || v === "30d" ? setProcessingRange(v) : null
              }
            >
              <SelectTrigger className="h-8 w-[130px] rounded-lg border-zinc-200 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={avgProcessingData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid {...chartTheme.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={chartTheme.axis.tick}
                  axisLine={{ stroke: "#e4e4e7" }}
                  tickLine={false}
                />
                <YAxis
                  tick={chartTheme.axis.tick}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  tickFormatter={(v) => `${Number(v).toFixed(0)}ms`}
                />
                <Tooltip contentStyle={chartTheme.tooltip.contentStyle} />
                <Bar dataKey="value">
                  {avgProcessingData.map((d) => {
                    const fill =
                      d.name === "LLM"
                        ? "#09090b"
                        : d.name === "OCR"
                          ? "#0d9488"
                          : "#d4d4d8";
                    return <Cell key={d.name} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-3">
          {(["ALL", "QUEUED", "PROCESSING", "COMPLETED", "FAILED"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                status === s ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {s}
            </button>
          ))}
          <input
            placeholder="Search task_id..."
            className="ml-auto w-60 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none"
          />
        </div>

        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">Task ID</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">Model</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">API Key</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">Status</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500 text-right">Cost</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500 text-right">Time</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500 text-right">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const model = modelList.find((m) => m.model_id === t.model_id);
              const key = keyList.find((k) => k.api_key_id === t.api_key_id);
              return (
                <tr
                  key={t.task_id}
                  className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer"
                  onClick={() => setDrawerTaskId(t.task_id)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {t.task_id.slice(0, 12)}...
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-900">{model?.fullname ?? "—"}</td>
                  <td className="px-4 py-3">
                    {key ? <MaskedKey fullKey={key.key} /> : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {formatNPR(t.total_cost)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-500">
                    {formatDuration(t.processing_time_ms)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-400">
                    {formatRelative(new Date(t.created_at))}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-zinc-400">
                  No tasks found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <AdminDetailDrawer
        open={drawerTaskId != null}
        onOpenChange={(o) => !o && setDrawerTaskId(null)}
        title="Task details"
        width={560}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="text-sm text-zinc-400">Task</div>
            <div className="font-mono text-sm text-zinc-950 bg-zinc-50 rounded-xl p-3">
              {selected.task_id}
            </div>
            <div className="flex gap-2">
              <StatusBadge status={selected.status} />
              <span className="inline-flex rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-600">
                Cost: {formatNPR(selected.total_cost)}
              </span>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
                Error / payload (mock)
              </div>
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-zinc-950 p-4 font-mono text-xs text-zinc-200">
                {selected.status === "FAILED"
                  ? selected.result_payload
                  : selected.request_payload}
              </pre>
            </div>
          </div>
        ) : null}
      </AdminDetailDrawer>
    </div>
  );
}

