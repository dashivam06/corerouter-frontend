"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  adminFetchUsers,
} from "@/lib/admin-api";
import { formatNPR, formatRelative } from "@/lib/formatters";
import { chartTheme } from "@/lib/charts";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminStatCard } from "@/components/admin/stat-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AdminUser } from "@/lib/admin-mock-data";

function avatarInitials(u: AdminUser) {
  return (
    u.full_name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

const USER_ROLES = ["USER", "ADMIN"] as const;
const USER_STATUSES = ["ACTIVE", "INACTIVE", "BANNED", "SUSPENDED"] as const;

type PendingUserChange = {
  userId: number;
  field: "role" | "status";
  from: string;
  to: string;
};

export default function AdminUsersPage() {
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminFetchUsers,
  });

  const list = users ?? [];

  const [statusTab, setStatusTab] = useState<
    "ALL" | "ACTIVE" | "RESTRICTED" | "INACTIVE"
  >("ALL");
  const [roleTab, setRoleTab] = useState<"ALL" | "USER" | "ADMIN">("ALL");
  const [q, setQ] = useState("");
  const [roleOverrides, setRoleOverrides] = useState<Record<number, AdminUser["role"]>>({});
  const [statusOverrides, setStatusOverrides] = useState<Record<number, AdminUser["status"]>>({});
  const [pendingChange, setPendingChange] = useState<PendingUserChange | null>(null);

  const getRole = (u: AdminUser) => roleOverrides[u.user_id] ?? u.role;
  const getStatus = (u: AdminUser) => statusOverrides[u.user_id] ?? u.status;

  const pendingUser = useMemo(
    () => list.find((u) => u.user_id === pendingChange?.userId) ?? null,
    [list, pendingChange]
  );

  function applyPendingChange() {
    if (!pendingChange) return;
    if (pendingChange.field === "role") {
      setRoleOverrides((prev) => ({
        ...prev,
        [pendingChange.userId]: pendingChange.to as AdminUser["role"],
      }));
    } else {
      setStatusOverrides((prev) => ({
        ...prev,
        [pendingChange.userId]: pendingChange.to as AdminUser["status"],
      }));
    }
    setPendingChange(null);
  }

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const pastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const total = list.length;
    const active = list.filter((u) => getStatus(u) === "ACTIVE").length;
    const inactive = list.filter((u) => getStatus(u) === "INACTIVE").length;
    const restricted = list.filter(
      (u) => getStatus(u) === "BANNED" || getStatus(u) === "SUSPENDED"
    ).length;
    const admins = list.filter((u) => getRole(u) === "ADMIN").length;
    const activeBase = active + inactive;
    const activeShare = activeBase > 0 ? (active / activeBase) * 100 : 0;

    const usersThisMonth = list.filter(
      (u) => new Date(u.created_at).getTime() >= monthStart.getTime()
    ).length;
    const usersPastMonth = list.filter((u) => {
      const createdTs = new Date(u.created_at).getTime();
      return createdTs >= pastMonthStart.getTime() && createdTs < monthStart.getTime();
    }).length;

    const deltaFromPastMonth =
      usersPastMonth > 0
        ? ((usersThisMonth - usersPastMonth) / usersPastMonth) * 100
        : 0;

    return {
      total,
      active,
      inactive,
      restricted,
      admins,
      deltaFromPastMonth,
      activeShare,
    };
  }, [list, roleOverrides, statusOverrides]);

  const filtered = useMemo(() => {
    let out = list;
    if (statusTab === "ACTIVE") out = out.filter((u) => getStatus(u) === "ACTIVE");
    if (statusTab === "INACTIVE")
      out = out.filter((u) => getStatus(u) === "INACTIVE");
    if (statusTab === "RESTRICTED")
      out = out.filter((u) => getStatus(u) === "BANNED" || getStatus(u) === "SUSPENDED");
    if (roleTab !== "ALL") out = out.filter((u) => getRole(u) === roleTab);
    const s = q.trim().toLowerCase();
    if (s) {
      out = out.filter(
        (u) => {
          const username = u.email.split("@")[0]?.toLowerCase() ?? "";
          return (
            u.full_name.toLowerCase().includes(s) ||
            u.email.toLowerCase().includes(s) ||
            username.includes(s) ||
            String(u.user_id).includes(s)
          );
        }
      );
    }
    return out;
  }, [list, statusTab, roleTab, q, roleOverrides, statusOverrides]);

  const PAGE_SIZE = 5;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [statusTab, roleTab, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // User lifecycle volume (mock): last 14 days
  const lifecycleSeries = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      day: `D-${13 - i}`,
      CREATED: Math.max(0, 10 + i),
      DELETED: i % 6 === 0 ? 1 : 0,
      REVOKED: i % 5 === 0 ? 2 : 0,
    }));
  }, []);

  return (
    <div>
      <AdminHeader
        title="Users"
        subtitle="Manage accounts, statuses, and access across the platform."
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-zinc-950 p-5 text-white">
          <p className="text-xs text-zinc-400">Total users</p>
          <p className="mt-1 text-[28px] font-semibold">{stats.total}</p>
          <p className={`mt-2 text-xs ${stats.deltaFromPastMonth >= 0 ? "text-green-400" : "text-red-400"}`}>
            {stats.deltaFromPastMonth >= 0 ? "↑" : "↓"} {Math.abs(stats.deltaFromPastMonth).toFixed(1)}% from past month
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-1 text-xs text-zinc-500">Active / Inactive</p>
          <p className="text-2xl font-semibold text-zinc-950">
            {stats.active} / {stats.inactive}
          </p>
          <p
            className={`mt-3 text-xs font-bold  ${
              stats.activeShare >= 80
                ? "text-green-600"
                : stats.activeShare >= 60
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            Active share: {stats.activeShare.toFixed(1)}%
          </p>
        </div>
        <AdminStatCard label="Restricted ( SUSPENDED )" value={stats.restricted} />
        <AdminStatCard label="Admins" value={stats.admins} />
      </div>

      {/* Lifecycle volume */}
      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="mb-3 text-sm font-medium text-zinc-500">
          User lifecycle volume by status, last 14 days (mock)
        </p>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={lifecycleSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...chartTheme.grid} vertical={false} />
              <XAxis dataKey="day" tick={false} />
              <YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={chartTheme.tooltip.contentStyle} />
              <Bar dataKey="CREATED" stackId="a" fill="#09090b" />
              <Bar dataKey="REVOKED" stackId="a" fill="#f59e0b" />
              <Bar dataKey="DELETED" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Users table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="flex flex-wrap gap-2 items-center border-b border-zinc-100 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["ALL", "All"],
                ["ACTIVE", "Active"],
                ["RESTRICTED", "Restricted"],
                ["INACTIVE", "Inactive"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  statusTab === k
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-500 hover:bg-zinc-100"
                }`}
                onClick={() => setStatusTab(k)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="ml-3 flex flex-wrap gap-2">
            {(
              [
                ["ALL", "All"],
                ["USER", "Users"],
                ["ADMIN", "Admins"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  roleTab === k
                    ? "bg-zinc-950 border-zinc-950 text-white"
                    : "border-zinc-200 text-zinc-500 hover:bg-zinc-100"
                }`}
                onClick={() => setRoleTab(k)}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email..."
            className="ml-auto w-56 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </div>

        <div className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  User
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  Role
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  Status
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500 text-right">
                  Balance
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  Last login
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-zinc-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr
                    key={u.user_id}
                    className="border-b border-zinc-100 hover:bg-zinc-50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-600">
                          {u.profile_image ? (
                            <img
                              src={u.profile_image}
                              alt=""
                              className="size-8 rounded-full object-cover"
                            />
                          ) : (
                            avatarInitials(u)
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-zinc-900">
                            {u.full_name}
                          </div>
                          <div className="text-xs text-zinc-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={getRole(u)}
                        onValueChange={(value) => {
                          const nextRole = value as AdminUser["role"];
                          const currentRole = getRole(u);
                          if (nextRole === currentRole) return;
                          setPendingChange({
                            userId: u.user_id,
                            field: "role",
                            from: currentRole,
                            to: nextRole,
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 w-[110px] rounded-lg border-zinc-200 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {USER_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={getStatus(u)}
                        onValueChange={(value) => {
                          const nextStatus = value as AdminUser["status"];
                          const currentStatus = getStatus(u);
                          if (nextStatus === currentStatus) return;
                          setPendingChange({
                            userId: u.user_id,
                            field: "status",
                            from: currentStatus,
                            to: nextStatus,
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 w-[130px] rounded-lg border-zinc-200 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {USER_STATUSES.map((statusValue) => (
                            <SelectItem key={statusValue} value={statusValue}>
                              {statusValue}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      <span className={u.balance <= 0 ? "text-red-600" : "text-zinc-500"}>
                        {formatNPR(u.balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {u.last_login ? formatRelative(new Date(u.last_login)) : "Never"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500">
          <span>
            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <AlertDialog
        open={pendingChange != null}
        onOpenChange={(open) => {
          if (!open) setPendingChange(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl border border-zinc-200 p-0">
          <AlertDialogHeader className="items-start px-4 pt-4 text-left">
            <AlertDialogTitle>
              {pendingChange?.field === "role" ? "Confirm role update" : "Confirm status update"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingChange
                ? `Review the change for ${pendingUser?.full_name ?? `user #${pendingChange.userId}`}. This will update the selected ${pendingChange.field} immediately.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingChange ? (
            <div className="relative mx-4 my-3 rounded-xl border border-zinc-200 bg-zinc-50 py-5 px-3 text-xs">
              <span className="absolute -top-2 left-3 bg-zinc-50 px-1 text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                Change summary
              </span>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-zinc-500">Current</span>
                  <span className="inline-flex rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700">
                    {pendingChange.from}
                  </span>
                </div>
                <div className="h-4 w-px bg-zinc-200" />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-zinc-700">New</span>
                  <span className="inline-flex rounded-md border border-zinc-900 bg-zinc-950 px-2.5 py-1 text-sm font-semibold text-white">
                    {pendingChange.to}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
          <AlertDialogFooter className="!mx-0 !mb-0 rounded-b-2xl border-zinc-100 bg-zinc-50 px-4 py-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-zinc-950 text-white hover:bg-zinc-900"
              onClick={applyPendingChange}
            >
              Yes, update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

