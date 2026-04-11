"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart2,
  ChevronDown,
  Cpu,
  CreditCard,
  Key,
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react";
import { logoutAuth } from "@/lib/api";
import { clearAllAuthClientTokens, getRefreshTokenCookie } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

export function MarketingAuthActions() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const authBootstrapped = useAuthStore((s) => s.authBootstrapped);
  const [avatarFailed, setAvatarFailed] = useState(false);

  if (!authBootstrapped || !user) {
    return (
      <div className="flex items-center gap-8">
        <Link
          href="/models"
          className="font-montserrat text-sm font-semibold text-zinc-600 transition-all hover:-translate-y-0.5 hover:text-zinc-950"
        >
          Models
        </Link>
        <Link
          href="/login"
          className="font-montserrat text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-950"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="font-montserrat rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-zinc-950/20"
        >
          Get started
        </Link>
      </div>
    );
  }

  const displayName = user.full_name?.trim() || user.email;
  const showAvatarImage = Boolean(user.profile_image) && !avatarFailed;

  const menuItems = [
    { label: "Dashboard", href: "/dashboard", Icon: LayoutDashboard },
    { label: "API Keys", href: "/dashboard/api-keys", Icon: Key },
    { label: "Models", href: "/dashboard/models", Icon: Cpu },
    { label: "Usage", href: "/dashboard/usage", Icon: BarChart2 },
    { label: "Billing", href: "/dashboard/billing", Icon: CreditCard },
    { label: "Settings", href: "/dashboard/settings", Icon: Settings },
  ] as const;

  async function onSignOut() {
    const refreshToken = getRefreshTokenCookie();
    logout();
    if (refreshToken) {
      try {
        await logoutAuth(refreshToken);
      } catch {
        // Local session is already cleared.
      }
    }
    clearAllAuthClientTokens();
    router.push("/login");
  }

  return (
    <div className="flex items-center gap-7">
      <Link
        href="/models"
        className="font-montserrat text-sm font-semibold text-zinc-600 transition-all hover:-translate-y-0.5 hover:text-zinc-950"
      >
        Models
      </Link>
      <Link
        href="/dashboard"
        className="font-montserrat rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-zinc-950/20"
      >
        Dashboard
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger className="hidden cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 outline-none sm:flex">
          {showAvatarImage ? (
            <img
              src={user.profile_image ?? ""}
              alt=""
              aria-hidden="true"
              className="size-8 rounded-full object-cover"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
              {initialsFromName(displayName)}
            </div>
          )}
          <p className="max-w-[140px] truncate pr-1 text-xs font-semibold text-zinc-900">{displayName}</p>
          <ChevronDown className="size-3.5 text-zinc-500" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="font-montserrat w-52 rounded-xl border border-zinc-200 bg-white p-1.5">
          {menuItems.map((item) => (
            <DropdownMenuItem
              key={item.label}
              className="font-montserrat cursor-pointer rounded-lg px-2.5 py-2 text-sm text-zinc-700"
              onClick={() => router.push(item.href)}
            >
              <item.Icon className="size-4 text-zinc-500" />
              {item.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="font-montserrat cursor-pointer rounded-lg px-2.5 py-2 text-sm"
            onClick={() => {
              void onSignOut();
            }}
          >
            <LogOut className="size-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}