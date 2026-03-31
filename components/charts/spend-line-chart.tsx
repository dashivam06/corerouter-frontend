"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTheme } from "@/lib/charts";

export function SpendLineChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
          width={40}
        />
        <Tooltip
          contentStyle={chartTheme.tooltip.contentStyle}
          formatter={(v) => [
            `रू ${Number(v ?? 0).toFixed(2)}`,
            "Spend",
          ]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="none"
          fill="rgba(9,9,11,0.04)"
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#09090b"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#09090b" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
