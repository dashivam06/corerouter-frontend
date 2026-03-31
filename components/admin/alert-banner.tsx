"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function AlertBanner({
  id,
  tone,
  title,
  description,
  actionLabel,
  onAction,
}: {
  id: string;
  tone: "amber" | "red";
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const key = `admin-banner-dismissed:${id}`;
      setDismissed(sessionStorage.getItem(key) === "1");
    } catch {
      // ignore
    }
  }, [id]);

  if (dismissed) return null;

  const toneClasses =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-red-200 bg-red-50 text-red-800";

  return (
    <div className={`w-full rounded-xl border ${toneClasses} p-3 pl-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{title}</div>
          {description ? (
            <div className="mt-1 text-sm text-current/80">{description}</div>
          ) : null}
          {actionLabel && onAction ? (
            <button
              type="button"
              className="mt-3 inline-flex rounded-xl border px-3 py-1.5 text-sm"
              onClick={onAction}
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg p-2 text-current/70 hover:text-current"
          onClick={() => {
            try {
              sessionStorage.setItem(`admin-banner-dismissed:${id}`, "1");
            } catch {
              // ignore
            }
            setDismissed(true);
          }}
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

