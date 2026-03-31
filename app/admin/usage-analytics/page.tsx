"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminStatCard } from "@/components/admin/stat-card";
import { chartTheme } from "@/lib/charts";
import {
  adminFetchApiKeys,
  adminFetchModels,
  adminFetchUsageRecords,
} from "@/lib/admin-api";
import { formatCost, formatNPR, formatRelative } from "@/lib/formatters";
import { StatusBadge } from "@/components/shared/status-badge";
import { unitTypeColors } from "@/lib/charts";

export default function AdminUsageAnalyticsPage() {
  const { data: usage } = useQuery({
    queryKey: ["admin-usage-records"],
    queryFn: adminFetchUsageRecords,
  });
  const { data: models } = useQuery({
    queryKey: ["admin-models"],
    queryFn: adminFetchModels,
  });
  const { data: apiKeys } = useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: adminFetchApiKeys,
  });

  const list = usage ?? [];
  const modelList = models ?? [];
  const keyList = apiKeys ?? [];

  const [range, setRange] = useState<
    "TODAY" | "7D" | "30D" | "THIS_MONTH" | "LAST_MONTH" | "CUSTOM"
  >("TODAY");

  const summary = useMemo(() => {
    const totalRevenue = list.reduce((a, r) => a + r.cost, 0);
    const totalTasks = new Set(list.map((r) => r.task_id)).size;
    const units = list.reduce((a, r) => a + r.quantity, 0);
    const uniqueKeys = new Set(list.map((r) => r.api_key_id)).size;
    const avgCost = totalTasks ? totalRevenue / totalTasks : 0;
    return { totalRevenue, totalTasks, units, uniqueKeys, avgCost };
  }, [list]);

  const unitBreakdown = useMemo(() => {
    const m = new Map<string, { quantity: number; cost: number }>();
    for (const r of list) {
      const prev = m.get(r.usage_unit_type) ?? { quantity: 0, cost: 0 };
      prev.quantity += r.quantity;
      prev.cost += r.cost;
      m.set(r.usage_unit_type, prev);
    }
    return Array.from(m.entries())
      .map(([k, v]) => ({ unit: k, ...v }))
      .sort((a, b) => b.cost - a.cost);
  }, [list]);

  const chartData = useMemo(() => {
    // mock: 10 days
    return Array.from({ length: 10 }, (_, i) => ({
      day: `D${i + 1}`,
      INPUT_TOKENS: list[0]?.quantity ? 10 + i * 2 : 0,
      OUTPUT_TOKENS: list[1]?.quantity ? 8 + i * 1.5 : 0,
      PAGES: 2,
    }));
  }, [list]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <AdminHeader title="Analytics" subtitle="Usage and billing composition (mock)" />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["TODAY", "Today"],
              ["7D", "Last 7 days"],
              ["30D", "Last 30 days"],
              ["THIS_MONTH", "This month"],
              ["LAST_MONTH", "Last month"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setRange(k)}
              className={`rounded-full px-4 py-2 text-sm border transition-colors ${
                range === k
                  ? "bg-zinc-950 text-white border-zinc-950"
                  : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <AdminStatCard
          label="Total revenue (रू)"
          value={formatNPR(summary.totalRevenue)}
        />
        <AdminStatCard label="Total tasks" value={summary.totalTasks} />
        <AdminStatCard
          label="Units consumed"
          value={summary.units.toLocaleString()}
        />
        <AdminStatCard label="Unique API keys" value={summary.uniqueKeys} />
        <AdminStatCard
          label="Avg cost/task"
          value={formatNPR(summary.avgCost)}
        />
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="text-sm font-medium text-zinc-500 mb-1">
          Daily revenue by unit type
        </p>
        <p className="text-xs text-zinc-400 mb-3">
          Showing {range.replaceAll("_", " ")}
        </p>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...chartTheme.grid} vertical={false} />
              <XAxis dataKey="day" tick={chartTheme.axis.tick} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
              <YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} width={50} />
              <Tooltip contentStyle={chartTheme.tooltip.contentStyle} />
              <Bar dataKey="INPUT_TOKENS" stackId="a" fill={unitTypeColors.INPUT_TOKENS} />
              <Bar dataKey="OUTPUT_TOKENS" stackId="a" fill={unitTypeColors.OUTPUT_TOKENS} />
              <Bar dataKey="PAGES" stackId="a" fill={unitTypeColors.PAGES} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Unit breakdown table */}
      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-zinc-100">
          <p className="text-[14px] font-semibold text-zinc-900">
            Usage composition
          </p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-5 py-3 text-xs uppercase tracking-wide text-zinc-500">
                Unit type
              </th>
              <th className="px-5 py-3 text-xs uppercase tracking-wide text-zinc-500 text-right">
                Total quantity
              </th>
              <th className="px-5 py-3 text-xs uppercase tracking-wide text-zinc-500 text-right">
                Total cost (रू)
              </th>
              <th className="px-5 py-3 text-xs uppercase tracking-wide text-zinc-500 text-right">
                Avg rate/unit
              </th>
            </tr>
          </thead>
          <tbody>
            {unitBreakdown.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center text-zinc-400">
                  No usage data for this period.
                </td>
              </tr>
            ) : (
              unitBreakdown.map((r) => {
                const rate = r.quantity ? r.cost / r.quantity : 0;
                return (
                  <tr key={r.unit} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-sm"
                          style={{ background: unitTypeColors[r.unit] ?? "#71717a" }}
                        />
                        <span className="text-xs text-zinc-700">
                          {r.unit.replace(/_/g, " ")}
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-zinc-500">
                      {r.quantity.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-zinc-500">
                      {formatNPR(r.cost)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs text-zinc-500">
                      {rate.toFixed(6)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Raw usage records table (summary mock) */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-zinc-100">
          <p className="text-[14px] font-semibold text-zinc-900">Usage records</p>
          <button type="button" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
            Export CSV
          </button>
        </div>
        <div className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-5 py-3 text-xs uppercase tracking-wide text-zinc-500">Recorded at</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wide text-zinc-500">Model</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wide text-zinc-500">API Key</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wide text-zinc-500">Unit type</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wide text-zinc-500 text-right">Quantity</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wide text-zinc-500 text-right">Cost (रू)</th>
                <th className="px-5 py-3 text-xs uppercase tracking-wide text-zinc-500">Task ID</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-zinc-400">
                    No usage records.
                  </td>
                </tr>
              ) : (
                list.map((r) => {
                  const m = modelList.find((x) => x.model_id === r.model_id);
                  const k = keyList.find((x) => x.api_key_id === r.api_key_id);
                  return (
                    <tr key={r.usage_id} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="px-5 py-3 text-xs text-zinc-500">{formatRelative(new Date(r.recorded_at))}</td>
                      <td className="px-5 py-3 text-sm text-zinc-900">{m?.fullname ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-zinc-400">{k ? k.key.slice(0, 10) + "…" : "—"}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={r.usage_unit_type as any} className="text-zinc-600" />
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-zinc-500">
                        {r.quantity.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-zinc-500">
                        {formatNPR(r.cost)}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-zinc-400 underline-offset-4 hover:underline">
                        {r.task_id.slice(0, 10)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

