import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; positive: boolean };
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <p className="mb-1 text-xs text-zinc-500">{label}</p>
      <p
        className={cn(
          "text-2xl font-semibold text-zinc-950",
          valueClassName
        )}
      >
        {value}
      </p>
      {delta ? (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs",
            delta.positive ? "text-green-600" : "text-red-600"
          )}
        >
          {delta.positive ? (
            <TrendingUp className="size-3" />
          ) : (
            <TrendingDown className="size-3" />
          )}
          {delta.value}
        </p>
      ) : null}
    </div>
  );
}
