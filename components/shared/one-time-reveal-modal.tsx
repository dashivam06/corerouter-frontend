"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function OneTimeRevealModal({
  open,
  secret,
  onAcknowledge,
}: {
  open: boolean;
  secret: string | null;
  onAcknowledge: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <Dialog open={open && !!secret} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg rounded-2xl border border-zinc-200 shadow-none ring-1 ring-zinc-200"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-zinc-950">
            Your new API key
          </DialogTitle>
          <DialogDescription className="sr-only">
            Copy your API key before closing.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Copy this key now. it will never be shown again.
        </div>
        <div className="rounded-xl bg-zinc-950 p-4 font-mono text-sm break-all text-green-400">
          {secret}
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl border-zinc-200"
          onClick={copy}
        >
          {copied ? "Copied ✓" : "Copy key"}
        </Button>
        <Button
          type="button"
          className="w-full rounded-xl bg-zinc-950 text-white hover:bg-zinc-900"
          onClick={onAcknowledge}
        >
          I&apos;ve copied my key
        </Button>
      </DialogContent>
    </Dialog>
  );
}
