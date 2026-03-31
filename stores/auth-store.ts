"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MockUser } from "@/lib/mock-data";

type AuthState = {
  user: MockUser | null;
  accessToken: string | null;
  setSession: (user: MockUser, accessToken: string) => void;
  updateUser: (patch: Partial<MockUser>) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      setSession: (user, accessToken) => set({ user, accessToken }),
      updateUser: (patch) => {
        const u = get().user;
        if (u) set({ user: { ...u, ...patch } });
      },
      logout: () => set({ user: null, accessToken: null }),
    }),
    {
      name: "corerouter-auth",
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
    }
  )
);
