"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  Cpu,
  Key,
  RefreshCw,
  Server,
} from "lucide-react";
import {
  ResponsiveContainer,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import {
  adminFetchApiKeys,
  adminFetchModels,
  adminFetchTasks,
  adminFetchUsers,
  adminFetchWorkers,
  adminGetHourlyTaskVolumeToday,
  adminGetRevenueSevenDaysAgoByHour,
  adminGetRevenueTodayByHour,
  adminGetRevenueYesterdayByHour,
} from "@/lib/admin-api";
import { formatNPR, formatRelative } from "@/lib/formatters";
import { chartTheme } from "@/lib/charts";
import type { AdminTask } from "@/lib/admin-mock-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function HourlyTaskVolumeChart({
  data,
}: {
  data: { hour: number; value: number }[];
}) {
  const currentHour = new Date().getHours();
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...chartTheme.grid} vertical={false} />
          <XAxis
            dataKey="hour"
            ticks={[0, 4, 8, 12, 16, 20]}
            tick={chartTheme.axis.tick}
            axisLine={{ stroke: "#e4e4e7" }}
            tickLine={false}
          />
          <YAxis
            tick={chartTheme.axis.tick}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={chartTheme.tooltip.contentStyle}
            formatter={(v: any) => [v, "tasks"]}
          />
          <Bar dataKey="value">
            {data.map((d) => {
              const fill =
                d.hour === currentHour
                  ? "#09090b"
                  : d.hour < currentHour
                    ? "#e4e4e7"
                    : "#f4f4f5";
              return <Cell key={d.hour} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RevenueLinesChart({
  today,
  yesterday,
  sevenDaysAgo,
}: {
  today: number[];
  yesterday: number[];
  sevenDaysAgo: number[];
}) {
  const data = today.map((_, hour) => ({
    hour,
    today: today[hour] ?? 0,
    yesterday: yesterday[hour] ?? 0,
    seven: sevenDaysAgo[hour] ?? 0,
  }));

  return (
    <div>
      <div className="mb-3 flex gap-4">
        <span className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#09090b]" />
          Today
        </span>
        <span className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#a1a1aa]" />
          Yesterday
        </span>
        <span className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#d4d4d8]" />
          7 days ago
        </span>
      </div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid {...chartTheme.grid} vertical={false} />
            <XAxis
              dataKey="hour"
              ticks={[0, 4, 8, 12, 16, 20]}
              tick={chartTheme.axis.tick}
              axisLine={{ stroke: "#e4e4e7" }}
              tickLine={false}
            />
            <YAxis
              tick={chartTheme.axis.tick}
              axisLine={false}
              tickLine={false}
              width={60}
              tickFormatter={(v) => `रू ${Number(v).toFixed(0)}`}
            />
            <Tooltip contentStyle={chartTheme.tooltip.contentStyle} />
            <Line
              type="monotone"
              dataKey="today"
              stroke="#09090b"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="yesterday"
              stroke="#a1a1aa"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="seven"
              stroke="#d4d4d8"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function activityIcon(task: AdminTask) {
  if (task.status === "FAILED") return Server;
  if (task.status === "PROCESSING") return Cpu;
  if (task.status === "COMPLETED") return Key;
  return CreditCard;
}

export default function AdminDashboardPage() {
  const qc = useQueryClient();
  const [volumeRange, setVolumeRange] = useState("24h");
  const [revenueRange, setRevenueRange] = useState("24h");
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminFetchUsers,
  });
  const { data: apiKeys } = useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: adminFetchApiKeys,
  });
  const { data: models } = useQuery({
    queryKey: ["admin-models"],
    queryFn: adminFetchModels,
  });
  const { data: tasks } = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: adminFetchTasks,
  });
  const { data: workers } = useQuery({
    queryKey: ["admin-workers"],
    queryFn: adminFetchWorkers,
  });

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const now = new Date();

  const apiKeyStats = useMemo(() => {
    const list = apiKeys ?? [];
    const active = list.filter((k) => k.status === "ACTIVE").length;
    const dormant = list.filter((k) => {
      if (k.status !== "ACTIVE") return false;
      if (!k.last_used_at) return true;
      return (
        now.getTime() - new Date(k.last_used_at).getTime() >
        30 * 86400_000
      );
    }).length;
    return { active, dormant };
  }, [apiKeys, now]);

  const modelStats = useMemo(() => {
    const list = models ?? [];
    const active = list.filter((m) => m.status === "ACTIVE").length;
    const missingBilling = Math.min(
      2,
      list.filter((m) => m.status === "ACTIVE").length
    );
    return { active, missingBilling };
  }, [models]);

  const workerStats = useMemo(() => {
    const list = workers ?? [];
    const online = list.filter((w) => w.status === "ONLINE").length;
    const downCount = list.filter((w) => w.status !== "ONLINE").length;
    return { online, downCount };
  }, [workers]);

  const tasksStats = useMemo(() => {
    const list = tasks ?? [];
    const completedToday = list.filter(
      (t) => t.status === "COMPLETED" && new Date(t.created_at) >= todayStart
    ).length;
    const failedLast24h = list.filter(
      (t) =>
        t.status === "FAILED" &&
        now.getTime() - new Date(t.created_at).getTime() <= 86400_000
    );
    const queued = list.filter((t) => t.status === "QUEUED").length;
    return { completedToday, failedLast24h, queued };
  }, [tasks, todayStart, now]);

  const hourlyTaskVolume = adminGetHourlyTaskVolumeToday();
  const chartData = hourlyTaskVolume.map((v, hour) => ({ hour, value: v }));

  const revenueTodayByHour = adminGetRevenueTodayByHour();
  const revenueYesterdayByHour = adminGetRevenueYesterdayByHour();
  const revenueSevenByHour = adminGetRevenueSevenDaysAgoByHour();

  const earningsStats = useMemo(() => {
    const list = tasks ?? [];
    const nowDate = new Date();
    const monthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    const pastMonthStart = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1);

    const total = list.reduce((a, t) => a + (t.total_cost ?? 0), 0);
    const thisMonth = list
      .filter((t) => new Date(t.created_at).getTime() >= monthStart.getTime())
      .reduce((a, t) => a + (t.total_cost ?? 0), 0);
    const pastMonth = list
      .filter((t) => {
        const createdTs = new Date(t.created_at).getTime();
        return createdTs >= pastMonthStart.getTime() && createdTs < monthStart.getTime();
      })
      .reduce((a, t) => a + (t.total_cost ?? 0), 0);

    const deltaFromPastMonth =
      pastMonth > 0 ? ((thisMonth - pastMonth) / pastMonth) * 100 : 0;

    return { total, deltaFromPastMonth };
  }, [tasks]);

  const activity = useMemo(() => {
    const list = tasks ?? [];
    const derived = list.slice(0, 8).map((t, idx) => {
      const Icon = activityIcon(t);
      let desc = "";
      if (t.status === "FAILED") desc = `Task failed · ${t.task_id}`;
      else if (t.status === "PROCESSING") desc = `Task processing · ${t.task_id}`;
      else desc = `Task completed · ${t.task_id}`;
      return {
        id: t.task_id + ":" + idx,
        href: "/admin/tasks",
        icon: Icon,
        description: desc,
        timestampLabel: formatRelative(new Date(t.created_at)),
      };
    });
    return derived;
  }, [tasks]);

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-950">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Overview of today&apos;s activity and revenue performance.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          onClick={() => {
            qc.invalidateQueries({ queryKey: ["admin-users"] });
            qc.invalidateQueries({ queryKey: ["admin-api-keys"] });
            qc.invalidateQueries({ queryKey: ["admin-models"] });
            qc.invalidateQueries({ queryKey: ["admin-tasks"] });
            qc.invalidateQueries({ queryKey: ["admin-workers"] });
          }}
          aria-label="Refresh dashboard"
        >
          <RefreshCw className="size-4" />
          Refresh
        </button>
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-zinc-950 p-5 text-white">
          <p className="text-xs text-zinc-400">Total earnings (रू)</p>
          <p className="mt-1 text-[28px] font-semibold">{formatNPR(earningsStats.total)}</p>
          <p className={`mt-2 text-xs ${earningsStats.deltaFromPastMonth >= 0 ? "text-green-400" : "text-red-400"}`}>
            {earningsStats.deltaFromPastMonth >= 0 ? "↑" : "↓"} {Math.abs(earningsStats.deltaFromPastMonth).toFixed(1)}% from past month
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-1 text-xs text-zinc-500">Task processed today</p>
          <p className="text-2xl font-semibold text-zinc-950">
            {tasksStats.completedToday}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-1 text-xs text-zinc-500">Active users today</p>
          <p className="text-2xl font-semibold text-zinc-950">
            {(users ?? []).length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-1 text-xs text-zinc-500">New API keys today</p>
          <p className="text-2xl font-semibold text-zinc-950">0</p>
        </div>
      </div>

      {/* Two charts */}
      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-950">
              Task volume
            </p>
            <Select value={volumeRange} onValueChange={(v) => v != null && setVolumeRange(v)}>
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
          <HourlyTaskVolumeChart data={chartData} />
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-950">
              Revenue trend
            </p>
            <Select value={revenueRange} onValueChange={(v) => v != null && setRevenueRange(v)}>
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
          <RevenueLinesChart
            today={revenueTodayByHour}
            yesterday={revenueYesterdayByHour}
            sevenDaysAgo={revenueSevenByHour}
          />
        </div>
      </div>

      {/* Activity feed */}
      <div>
        <p className="mb-4 text-[15px] font-semibold text-zinc-950">
          Recent activity
        </p>
        <div className="rounded-2xl border border-zinc-200 bg-white">
          <div className="max-h-[480px] overflow-y-auto">
            {(activity as any[]).map((a, idx) => {
              const Icon = a.icon as any;
              const isLast = idx === (activity as any[]).length - 1;
              return (
                <a
                  key={a.id}
                  href={a.href}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 no-underline ${
                    isLast ? "" : "border-b border-zinc-100"
                  }`}
                >
                  <Icon className="mt-0.5 size-4 flex-shrink-0 text-zinc-500" />
                  <div className="min-w-0 flex-1 text-sm text-zinc-700">
                    {a.description}
                  </div>
                  <div className="shrink-0 text-xs text-zinc-400">
                    {a.timestampLabel}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

