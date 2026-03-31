import { format } from "date-fns";

export function formatNPR(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? "-" : "";
  return `रू ${sign}${formatted}`;
}

export function formatUnits(count: number, type: string): string {
  const t = type.toLowerCase();
  if (t.includes("page")) {
    const n = Math.round(count);
    return `${n.toLocaleString()} pages`;
  }
  const abs = Math.abs(count);
  let s: string;
  if (abs < 1000) s = String(Math.round(count));
  else if (abs < 1_000_000) s = `${(count / 1000).toFixed(1)}k`;
  else s = `${(count / 1_000_000).toFixed(2)}M`;
  return `${s} tokens`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

export function formatRelative(date: Date | null): string {
  if (!date) return "Never";
  const now = Date.now();
  const d = date.getTime();
  const diff = now - d;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)} days ago`;
  return format(date, "MMM d");
}

export function formatCost(amount: number): string {
  const abs = Math.abs(amount);
  if (abs < 0.01 && abs > 0) {
    return `रू ${amount.toLocaleString("en-NP", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })}`;
  }
  return `रू ${amount.toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
