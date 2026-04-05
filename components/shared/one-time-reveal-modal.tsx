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
import { Input } from "@/components/ui/input";

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
            New API key generated
          </DialogTitle>
          <DialogDescription className="sr-only">
            Copy your API key before closing.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-700">
          Store this key now — it will never be shown again.
        </div>
        <Input
          readOnly
          value={secret ?? ""}
          className="h-11 rounded-xl border-zinc-200 bg-white font-mono text-sm text-zinc-950"
          aria-label="New API key"
        />
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
          disabled={!copied}
        >
          {copied ? "I've copied my key" : "Copy the key to continue"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
