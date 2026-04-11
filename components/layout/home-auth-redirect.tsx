"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function HomeAuthRedirect() {
  const router = useRouter();
  const authBootstrapped = useAuthStore((s) => s.authBootstrapped);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!authBootstrapped) return;
    if (!accessToken) return;
    router.replace("/dashboard");
  }, [authBootstrapped, accessToken, router]);

  return null;
}