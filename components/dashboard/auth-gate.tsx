"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Waits for zustand/persist to finish reading localStorage before deciding auth.
 * The old `hydrated` flag + onRehydrateStorage callback was not firing reliably (v5),
 * which left the dashboard stuck on "Loading…".
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [storageReady, setStorageReady] = useState(false);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

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

  useEffect(() => {
    if (!storageReady) return;
    if (!user) router.replace("/login");
  }, [storageReady, user, router]);

  if (!storageReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Redirecting to sign in…
      </div>
    );
  }

  return <>{children}</>;
}
