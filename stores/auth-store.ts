"use client";

import { create } from "zustand";
import type { MockUser } from "@/lib/mock-data";

type AuthTokenSet = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

type AuthState = {
  user: MockUser | null;
  accessToken: string | null;
  accessTokenExpiresAt: number | null;
  authBootstrapped: boolean;
  setSession: (user: MockUser, tokens: AuthTokenSet) => void;
  setTokens: (tokens: AuthTokenSet) => void;
  setUser: (user: MockUser | null) => void;
  setAuthBootstrapped: (ready: boolean) => void;
  updateUser: (patch: Partial<MockUser>) => void;
  clearSession: () => void;
  logout: () => void;
};

function toExpiry(expiresIn: number) {
  return Date.now() + Math.max(expiresIn, 1) * 1000;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  accessToken: null,
  accessTokenExpiresAt: null,
  authBootstrapped: false,
  setSession: (user, tokens) =>
    set({
      user,
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: toExpiry(tokens.expiresIn),
    }),
  setTokens: (tokens) =>
    set({
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: toExpiry(tokens.expiresIn),
    }),
  setUser: (user) => set({ user }),
  setAuthBootstrapped: (ready) => set({ authBootstrapped: ready }),
  updateUser: (patch) => {
    const u = get().user;
    if (u) set({ user: { ...u, ...patch } });
  },
  clearSession: () =>
    set({
      user: null,
      accessToken: null,
      accessTokenExpiresAt: null,
    }),
  logout: () =>
    set({
      user: null,
      accessToken: null,
      accessTokenExpiresAt: null,
    }),
}));
