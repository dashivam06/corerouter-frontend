"use client";

import { PublicHeader } from "@/components/layout/public-header";

export default function ModelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-zinc-950 [font-family:var(--font-montserrat)]">
      <PublicHeader />
      <div className="mx-auto w-full max-w-6xl px-6 py-10">{children}</div>
    </div>
  );
}
