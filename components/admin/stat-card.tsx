import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminStatCard({
  label,
  value,
  className,
  valueClassName,
  labelClassName,
  delta,
}: {
  label: string;
  value: ReactNode;
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
  delta?: { text: string; positive: boolean } | null;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white p-5",
        className
      )}
    >
      <p className={cn("mb-1 text-xs text-zinc-500", labelClassName)}>{label}</p>
      <p
        className={cn("text-2xl font-semibold text-zinc-950", valueClassName)}
      >
        {value}
      </p>
      {delta ? (
        <p
          className={cn(
            "mt-1 text-xs",
            delta.positive ? "text-green-600" : "text-red-600"
          )}
        >
          {delta.text}
        </p>
      ) : null}
    </div>
  );
}

