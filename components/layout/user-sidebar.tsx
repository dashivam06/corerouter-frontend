"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart2,
  Cpu,
  CreditCard,
  Key,
  LayoutDashboard,
  LogOut,
  Network,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "API Keys", href: "/dashboard/api-keys", icon: Key },
  { label: "Models", href: "/dashboard/models", icon: Cpu },
  { label: "Usage", href: "/dashboard/usage", icon: BarChart2 },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col bg-zinc-950 text-white">
      <div className="px-4 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-xl px-1 py-1 text-white"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-xl ">
            {!logoFailed ? (
              <img
                src="/corerouter-logo.png"
                alt="CoreRouter logo"
                className="size-7 object-contain"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <Network className="size-7 text-black" />
            )}
          </span>
          <span className="text-[15px] font-semibold tracking-[0.08em] text-white">
            COREROUTER
          </span>
        </Link>
        {/* <p className="mt-2 pl-12 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
          a product of Fleebug
        </p> */}
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-4">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mx-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200 "
              )}
            >
              <Icon className="size-4 shrink-0 opacity-90" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          {user?.profile_image ? (
            <img
              src={user.profile_image}
              alt=""
              className="size-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-200">
              {user ? initials(user.full_name || user.email) : "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user?.full_name ?? "User"}
            </p>
            <p className="truncate text-xs text-zinc-500">{user?.email}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
