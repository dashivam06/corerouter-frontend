"use client";

import { useAuthStore } from "@/stores/auth-store";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function AdminRoleGate({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  if (!user) return null;
  if (user.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 text-zinc-950">
        <h2 className="text-xl font-semibold">Access denied</h2>
        <p className="mt-2 text-sm text-zinc-500">
          This area is restricted to CoreRouter admins.
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            type="button"
            className="rounded-xl bg-zinc-950 px-5 py-2 text-white hover:bg-zinc-900"
            onClick={() => router.push("/dashboard")}
          >
            Go to dashboard
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-zinc-200"
            onClick={() => router.push("/login")}
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

