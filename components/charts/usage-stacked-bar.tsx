"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTheme, unitTypeColors } from "@/lib/charts";

type Row = Record<string, string | number>;

export function UsageStackedBar({
  data,
  keys,
}: {
  data: Row[];
  keys: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...chartTheme.grid} vertical={false} />
        <XAxis
          dataKey="day"
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
        />
        {keys.map((k) => (
          <Bar
            key={k}
            dataKey={k}
            stackId="a"
            fill={unitTypeColors[k] ?? "#71717a"}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
