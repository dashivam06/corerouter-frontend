"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchModels, fetchTasks } from "@/lib/api";
import { mockUsageRecords } from "@/lib/mock-data";
import { UserHeader } from "@/components/layout/user-header";
import { StatCard } from "@/components/cards/stat-card";
import { UsageStackedBar } from "@/components/charts/usage-stacked-bar";
import { unitTypeColors } from "@/lib/charts";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCost, formatDuration, formatRelative } from "@/lib/formatters";
import { TaskDetailDrawer } from "@/components/shared/task-detail-drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statuses = ["All", "QUEUED", "PROCESSING", "COMPLETED", "FAILED"] as const;

export default function UsagePage() {
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const { data: models } = useQuery({ queryKey: ["models"], queryFn: fetchModels });

  const [period, setPeriod] = useState("month");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [drawerTask, setDrawerTask] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = tasks ?? [];
    if (statusFilter !== "All") {
      list = list.filter((t) => t.status === statusFilter);
    }
    if (modelFilter !== "all") {
      const mid = Number(modelFilter);
      list = list.filter((t) => t.model_id === mid);
    }
    return list;
  }, [tasks, statusFilter, modelFilter]);

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
    models?.find((m) => m.model_id === 1)?.fullname ?? "GPT-4o November 2024";

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
        <UsageStackedBar data={barData} keys={unitKeys} />
      </div>

      <div>
        <p className="mb-3 text-[13px] font-medium text-zinc-500 ">
          Activity log
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                statusFilter === s
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {s === "All" ? s : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
          <Select
            value={modelFilter}
            onValueChange={(v) => v != null && setModelFilter(v)}
          >
            <SelectTrigger className="ml-auto h-9 w-48 rounded-xl border-zinc-200">
              <SelectValue placeholder="All models" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All models</SelectItem>
              {(models ?? []).map((m) => (
                <SelectItem key={m.model_id} value={String(m.model_id)}>
                  {m.fullname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Time</th>
                <th className="px-4 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-zinc-400">
                    No tasks in this period
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const m = models?.find((x) => x.model_id === t.model_id);
                  return (
                    <tr
                      key={t.task_id}
                      className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50"
                      onClick={() => setDrawerTask(t.task_id)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                        {t.task_id.slice(0, 12)}…
                      </td>
                      <td className="px-4 py-3 text-[13px] text-zinc-900">
                        {m?.fullname ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {formatCost(t.total_cost)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-500">
                        {formatDuration(t.processing_time_ms)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-zinc-400">
                        {formatRelative(new Date(t.created_at))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TaskDetailDrawer
        taskId={drawerTask}
        open={!!drawerTask}
        onOpenChange={(o) => !o && setDrawerTask(null)}
      />
    </>
  );
}
