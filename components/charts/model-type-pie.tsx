"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { chartTheme } from "@/lib/charts";

const COLORS: Record<string, string> = {
  LLM: "#7c3aed",
  OCR: "#0d9488",
  OTHER: "#71717a",
};

export function ModelTypePie({
  data,
}: {
  data: { name: string; value: number; type: string }[];
}) {
  const typeCount = data.length;
  const chartHeight = typeCount <= 2 ? 230 : 190;
  const innerRadius = typeCount <= 2 ? 62 : 50;
  const outerRadius = typeCount <= 2 ? 92 : 76;

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((e) => (
            <Cell key={e.type} fill={COLORS[e.type] ?? "#a1a1aa"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={chartTheme.tooltip.contentStyle}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ModelTypePieLegend({
  data,
}: {
  data: { name: string; value: number; type: string; count?: number }[];
}) {
  return (
    <div className="flex flex-wrap justify-start gap-2 px-1">
      {data.map((s) => (
        <span
          key={s.type}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-600"
        >
          <span
            className="size-2.5 rounded-sm"
            style={{ background: COLORS[s.type] ?? "#a1a1aa" }}
          />
          <span>{s.name}</span>
          <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] text-zinc-500">{s.count ?? s.value}</span>
        </span>
      ))}
    </div>
  );
}
