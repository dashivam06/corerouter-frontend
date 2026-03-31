"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type AdminActivityItem = {
  id: string;
  href: string;
  icon: LucideIcon;
  iconToneClass?: string;
  description: string;
  timestampLabel: string;
};

export function ActivityFeed({
  items,
  emptyLabel = "No activity yet",
}: {
  items: AdminActivityItem[];
  emptyLabel?: string;
}) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-sm text-zinc-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="max-h-[480px] overflow-y-auto rounded-2xl border border-zinc-200 bg-white">
      {items.map((it, idx) => (
        <a
          key={it.id}
          href={it.href}
          className="flex items-start gap-3 px-4 py-3 no-underline hover:bg-zinc-50"
        >
          <it.icon
            className={`mt-0.5 size-4 shrink-0 text-zinc-500 ${
              it.iconToneClass ?? ""
            }`}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm text-zinc-700">{it.description}</div>
          </div>
          <div className="shrink-0 text-xs text-zinc-400">
            {it.timestampLabel}
          </div>
          {idx < items.length - 1 ? (
            <div className="absolute left-4 right-4 mt-10 border-b border-zinc-100" />
          ) : null}
        </a>
      ))}
    </div>
  );
}

