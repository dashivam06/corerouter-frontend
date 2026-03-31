import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function QuickActionCard({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition-colors",
        "hover:border-zinc-300 hover:bg-zinc-50"
      )}
    >
      <Icon className="size-4 shrink-0 text-zinc-600" />
      <span className="text-[13px] font-medium text-zinc-900">{label}</span>
    </Link>
  );
}
