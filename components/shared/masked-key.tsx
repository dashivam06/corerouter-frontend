"use client";

import { Check, Clipboard } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function maskApiKey(key: string) {
  return key ? "cr_live_••••••••" : "cr_live_••••••••";
}

export function MaskedKey({
  fullKey,
  className,
}: {
  fullKey: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const display = maskApiKey(fullKey);

  async function copy() {
    await navigator.clipboard.writeText(fullKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <code className="rounded-lg bg-zinc-50 px-3 py-1.5 font-mono text-sm text-zinc-600">
        {display}
      </code>
      <button
        type="button"
        onClick={copy}
        className="text-zinc-400 transition-colors hover:text-zinc-700"
        aria-label="Copy key"
      >
        {copied ? (
          <Check className="size-3.5 text-green-600" />
        ) : (
          <Clipboard className="size-3.5" />
        )}
      </button>
    </span>
  );
}
