import { cn } from "@/lib/utils";
import { badgeStyles } from "@/lib/charts";

const base =
  "inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full";

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style = badgeStyles[status] ?? badgeStyles.INACTIVE;
  const processing = status === "PROCESSING";
  const label =
    status === "NOTHING"
      ? "Draft"
      : status === "DEPRECATED"
        ? "Deprecated"
        : status === "ARCHIVED"
          ? "Archived"
          : status.replace(/_/g, " ");
  return (
    <span className={cn(base, style, className)}>
      {processing ? (
        <span
          className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-amber-500"
          aria-hidden
        />
      ) : null}
      {label}
    </span>
  );
}
