"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ReactNode } from "react";

export function AdminDetailDrawer({
  open,
  onOpenChange,
  title,
  width = 480,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  width?: number;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={true}
        className="border-l border-zinc-200 shadow-none sm:max-w-[90vw]"
        // base SheetContent uses fixed padding/rounded styles; we only set width.
        style={{ width }}
      >
        <SheetHeader className="p-6 pb-0">
          <SheetTitle className="text-base font-semibold text-zinc-950">
            {title}
          </SheetTitle>
        </SheetHeader>
        <div className="px-6 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

