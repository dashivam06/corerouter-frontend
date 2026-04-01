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
      <div className="w-full px-8 py-10">
        {children}
      </div>
    </div>
  );
}
