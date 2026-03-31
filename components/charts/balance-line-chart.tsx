"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTheme } from "@/lib/charts";

export function BalanceLineChart({
  data,
}: {
  data: { date: string; balance: number }[];
}) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...chartTheme.grid} vertical={false} />
        <XAxis
          dataKey="label"
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
          formatter={(v) => [
            `रू ${Number(v ?? 0).toFixed(2)}`,
            "Balance",
          ]}
        />
        <Line
          type="monotone"
          dataKey="balance"
          stroke="#dc2626"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#dc2626" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
