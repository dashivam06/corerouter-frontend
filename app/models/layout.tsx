"use client";

import { useEffect, useState } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { UserSidebar } from "@/components/layout/user-sidebar";
import { useAuthStore } from "@/stores/auth-store";

export default function ModelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [storageReady, setStorageReady] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const { persist } = useAuthStore;
    if (persist.hasHydrated()) {
      setStorageReady(true);
      return;
    }
    const unsub = persist.onFinishHydration(() => {
      setStorageReady(true);
    });
    return unsub;
  }, []);

  if (!storageReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-zinc-500 [font-family:var(--font-montserrat)]">
        Loading models…
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-950 [font-family:var(--font-montserrat)]">
        <UserSidebar />
        <main className="pl-[240px]">
          <div className="mx-auto w-full max-w-6xl px-8 py-10">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950 [font-family:var(--font-montserrat)]">
      <PublicHeader />
      <div className="w-full px-8 py-10">{children}</div>
    </div>
  );
}
