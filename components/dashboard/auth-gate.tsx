"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const authBootstrapped = useAuthStore((s) => s.authBootstrapped);
  const router = useRouter();

  useEffect(() => {
    if (!authBootstrapped) return;
    if (!user) router.replace("/login");
  }, [authBootstrapped, user, router]);

  if (!authBootstrapped) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Restoring session…
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
