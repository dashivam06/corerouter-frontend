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
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={56}
          outerRadius={80}
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
  data: { name: string; value: number; type: string }[];
}) {
  return (
    <div className="flex flex-wrap justify-center gap-3 px-2">
      {data.map((s) => (
        <span
          key={s.type}
          className="flex items-center gap-1.5 text-xs text-zinc-500"
        >
          <span
            className="size-2.5 rounded-sm"
            style={{ background: COLORS[s.type] ?? "#a1a1aa" }}
          />
          {s.name} ({s.value}%)
        </span>
      ))}
    </div>
  );
}
