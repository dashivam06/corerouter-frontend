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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminStatCard } from "@/components/admin/stat-card";
import { formatNPR, formatRelative } from "@/lib/formatters";
import { chartTheme } from "@/lib/charts";
import {
  adminFetchUsers,
  adminFetchUserAnalytics,
  adminFetchUserInsights,
  adminFetchUsersPage,
  adminUpdateUserStatus,
  type AdminUsersPageItem,
} from "@/lib/admin-api";
import { ApiRequestError, type UserRole, type UserStatus } from "@/lib/api";

const PAGE_SIZE = 5;

type LifecycleRange = "7d" | "14d" | "1m" | "3m" | "6m" | "1y";

type PendingUserChange = {
  userId: number;
  field: "role" | "status";
  from: UserRole | UserStatus;
  to: UserRole | UserStatus;
};

const LIFECYCLE_RANGE_LABELS: Record<LifecycleRange, string> = {
  "7d": "last 7 days",
  "14d": "last 14 days",
  "1m": "last 1 month",
  "3m": "last 3 months",
  "6m": "last 6 months",
  "1y": "last 1 year",
};

const USER_ROLES: UserRole[] = ["USER", "ADMIN"];
const USER_STATUSES: UserStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED", "BANNED", "DELETED"];

function mapErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiRequestError)) return "Unable to connect. Check your internet connection.";
  if (error.status === 403) return "You don't have permission to perform this action.";
  if (error.status === 429) return "Too many requests. Please slow down.";
  if (error.status === 503) return "Service temporarily unavailable. Try again later.";
  if (error.status >= 500) return fallback;
  return error.message || fallback;
}

function avatarInitials(u: AdminUsersPageItem) {
  return (
    u.fullName
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toApiLocalDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
}

function getRangeBounds(range: LifecycleRange): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 0);
  const from = new Date(to);

  if (range === "7d") from.setDate(from.getDate() - 6);
  else if (range === "14d") from.setDate(from.getDate() - 13);
  else if (range === "1m") from.setDate(from.getDate() - 29);
  else if (range === "3m") from.setMonth(from.getMonth() - 2, 1);
  else if (range === "6m") from.setMonth(from.getMonth() - 5, 1);
  else from.setMonth(from.getMonth() - 11, 1);

  from.setHours(0, 0, 0, 0);
  return { from, to };
}

function fillDailyRange(
  from: Date,
  to: Date,
  dailyAnalytics: Array<{ date: string; created: number; deleted: number; revoked: number }>
) {
  const map = Object.fromEntries(dailyAnalytics.map((d) => [d.date, d]));
  const rows: Array<{ date: string; created: number; deleted: number; revoked: number }> = [];

  for (let cursor = new Date(from); cursor.getTime() <= to.getTime(); cursor.setDate(cursor.getDate() + 1)) {
    const key = toDateKey(cursor);
    rows.push(map[key] ?? { date: key, created: 0, deleted: 0, revoked: 0 });
  }

  return rows;
}

function toLifecycleSeries(
  range: LifecycleRange,
  dailyAnalytics: Array<{ date: string; created: number; deleted: number; revoked: number }>,
  from: Date,
  to: Date
) {
  const filled = fillDailyRange(from, to, dailyAnalytics);

  if (range === "7d" || range === "14d" || range === "1m") {
    return filled.map((item) => {
      const date = new Date(`${item.date}T00:00:00`);
      return {
        label:
          range === "1m"
            ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
            : date.toLocaleDateString(undefined, { weekday: "short" }),
        CREATED: item.created,
        REVOKED: item.revoked,
        DELETED: item.deleted,
      };
    });
  }

  const grouped = new Map<string, { created: number; deleted: number; revoked: number; date: Date }>();
  for (const item of filled) {
    const date = new Date(`${item.date}T00:00:00`);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = grouped.get(key) ?? { created: 0, deleted: 0, revoked: 0, date: new Date(date.getFullYear(), date.getMonth(), 1) };
    existing.created += item.created;
    existing.deleted += item.deleted;
    existing.revoked += item.revoked;
    grouped.set(key, existing);
  }

  return Array.from(grouped.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((entry) => ({
      label: entry.date.toLocaleDateString(undefined, { month: "short" }),
      CREATED: entry.created,
      REVOKED: entry.revoked,
      DELETED: entry.deleted,
    }));
}

async function fetchUsersForUi(roleTab: "ALL" | UserRole, statusTab: "ALL" | "ACTIVE" | "RESTRICTED" | "INACTIVE") {
  const status: UserStatus | undefined =
    statusTab === "ACTIVE" ? "ACTIVE" : statusTab === "INACTIVE" ? "INACTIVE" : undefined;

  const fetchByRole = async (role: UserRole) => {
    if (statusTab === "RESTRICTED") {
      const [suspended, banned] = await Promise.all([
        adminFetchUsersPage({ page: 0, size: 500, role, status: "SUSPENDED" }),
        adminFetchUsersPage({ page: 0, size: 500, role, status: "BANNED" }),
      ]);
      return [...suspended.users, ...banned.users];
    }

    const response = await adminFetchUsersPage({ page: 0, size: 500, role, status });
    return response.users;
  };

  if (roleTab === "ALL") {
    const [users, admins] = await Promise.all([fetchByRole("USER"), fetchByRole("ADMIN")]);
    const merged = [...users, ...admins];
    return Array.from(new Map(merged.map((u) => [u.userId, u])).values());
  }

  return fetchByRole(roleTab);
}

export default function AdminUsersPage() {
  const [statusTab, setStatusTab] = useState<"ALL" | "ACTIVE" | "RESTRICTED" | "INACTIVE">("ALL");
  const [roleTab, setRoleTab] = useState<"ALL" | "USER" | "ADMIN">("ALL");
  const [q, setQ] = useState("");
  const [lifecycleRange, setLifecycleRange] = useState<LifecycleRange>("14d");
  const [page, setPage] = useState(1);
  const [roleOverrides, setRoleOverrides] = useState<Record<number, UserRole>>({});
  const [statusOverrides, setStatusOverrides] = useState<Record<number, UserStatus>>({});
  const [pendingChange, setPendingChange] = useState<PendingUserChange | null>(null);
  const [actionError, setActionError] = useState("");

  const { data: insights, error: insightsError } = useQuery({
    queryKey: ["admin-user-insights"],
    queryFn: adminFetchUserInsights,
  });

  const rangeBounds = useMemo(() => getRangeBounds(lifecycleRange), [lifecycleRange]);

  const { data: analytics, error: analyticsError, isLoading: analyticsLoading } = useQuery({
    queryKey: ["admin-user-analytics", lifecycleRange],
    queryFn: () =>
      adminFetchUserAnalytics(
        toApiLocalDateTime(rangeBounds.from),
        toApiLocalDateTime(rangeBounds.to)
      ),
  });

  const { data: usersList, error: usersError, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-users-ui-list", roleTab, statusTab],
    queryFn: () => fetchUsersForUi(roleTab, statusTab),
  });

  const { data: legacyUsers } = useQuery({
    queryKey: ["admin-users-legacy-meta"],
    queryFn: adminFetchUsers,
  });

  useEffect(() => {
    setPage(1);
  }, [statusTab, roleTab, q]);

  const list = usersList ?? [];

  const metaByUserId = useMemo(() => {
    const map = new Map<number, { balance: number; lastLogin: string | null }>();
    (legacyUsers ?? []).forEach((user) => {
      map.set(user.user_id, { balance: user.balance, lastLogin: user.last_login });
    });
    return map;
  }, [legacyUsers]);

  const getRole = (u: AdminUsersPageItem) => roleOverrides[u.userId] ?? u.role;
  const getStatus = (u: AdminUsersPageItem) => statusOverrides[u.userId] ?? u.status;

  const pendingUser = useMemo(
    () => list.find((u) => u.userId === pendingChange?.userId) ?? null,
    [list, pendingChange]
  );

  async function applyPendingChange() {
    if (!pendingChange) return;
    setActionError("");

    if (pendingChange.field === "role") {
      setRoleOverrides((prev) => ({
        ...prev,
        [pendingChange.userId]: pendingChange.to as UserRole,
      }));
    } else {
      try {
        await adminUpdateUserStatus(pendingChange.userId, pendingChange.to as UserStatus);
        setStatusOverrides((prev) => ({
          ...prev,
          [pendingChange.userId]: pendingChange.to as UserStatus,
        }));
        await refetchUsers();
      } catch (error) {
        setActionError(mapErrorMessage(error, "Failed to update user status. Please try again."));
      }
    }

    setPendingChange(null);
  }

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    let out = list;

    if (statusTab === "ACTIVE") {
      out = out.filter((u) => getStatus(u) === "ACTIVE");
    }
    if (statusTab === "INACTIVE") {
      out = out.filter((u) => getStatus(u) === "INACTIVE");
    }
    if (statusTab === "RESTRICTED") {
      out = out.filter((u) => getStatus(u) === "SUSPENDED" || getStatus(u) === "BANNED");
    }
    if (roleTab !== "ALL") {
      out = out.filter((u) => getRole(u) === roleTab);
    }

    if (!search) return out;
    return out.filter((u) => {
      const username = u.email.split("@")[0]?.toLowerCase() ?? "";
      return (
        u.fullName.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        username.includes(search) ||
        String(u.userId).includes(search)
      );
    });
  }, [list, q, statusTab, roleTab, roleOverrides, statusOverrides]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const lifecycleSeries = useMemo(() => {
    if (!analytics) return [];
    return toLifecycleSeries(lifecycleRange, analytics.dailyAnalytics, rangeBounds.from, rangeBounds.to);
  }, [analytics, lifecycleRange, rangeBounds.from, rangeBounds.to]);

  const displayedTotals = useMemo(() => {
    if (!analytics) {
      return { created: 0, deleted: 0, revoked: 0 };
    }

    const summed = analytics.dailyAnalytics.reduce(
      (acc, item) => ({
        created: acc.created + (item.created ?? 0),
        deleted: acc.deleted + (item.deleted ?? 0),
        revoked: acc.revoked + (item.revoked ?? 0),
      }),
      { created: 0, deleted: 0, revoked: 0 }
    );

    return {
      created: Math.max(analytics.totalCreated ?? 0, summed.created),
      deleted: Math.max(analytics.totalDeleted ?? 0, summed.deleted),
      revoked: Math.max(analytics.totalRevoked ?? 0, summed.revoked),
    };
  }, [analytics]);

  const insightsErrorMessage = insightsError
    ? mapErrorMessage(insightsError, "Failed to load user insights. Please try again.")
    : "";

  const analyticsErrorMessage = analyticsError
    ? mapErrorMessage(analyticsError, "Failed to load user analytics. Please try again.")
    : "";

  const usersErrorMessage = usersError
    ? mapErrorMessage(usersError, "Failed to load users. Please try again.")
    : "";

  const delta = insights?.usersChangeFromPastMonthPercent ?? 0;
  const deltaText = delta > 0 ? `↑ ${delta.toFixed(1)}% this month` : delta < 0 ? `↓ ${Math.abs(delta).toFixed(1)}% this month` : "No change";

  return (
    <div>
      <AdminHeader title="Users" subtitle="Manage accounts, statuses, and access across the platform." />

      {insightsErrorMessage ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {insightsErrorMessage}
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-zinc-950 p-5 text-white">
          <p className="text-xs text-zinc-400">Total users</p>
          <p className="mt-1 text-[28px] font-semibold">{insights?.totalUsers ?? 0}</p>
          <p className={`mt-2 text-xs ${delta >= 0 ? "text-green-400" : "text-red-400"}`}>{deltaText}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="mb-1 text-xs text-zinc-500">Active / Inactive</p>
          <p className="text-2xl font-semibold text-zinc-950">
            {insights?.activeUsers ?? 0} / {insights?.inactiveUsers ?? 0}
          </p>
          <p
            className={`mt-3 text-xs font-bold ${(insights?.activeSharePercent ?? 0) >= 80 ? "text-green-600" : (insights?.activeSharePercent ?? 0) >= 60 ? "text-amber-600" : "text-red-600"}`}
          >
            Active share: {(insights?.activeSharePercent ?? 0).toFixed(1)}%
          </p>
        </div>
        <AdminStatCard label="Restricted ( SUSPENDED )" value={insights ? insights.suspendedUsers : 0} />
        <AdminStatCard label="Admins" value={insights ? insights.adminUsers : 0} />
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-3">
          <p className="text-sm font-medium text-zinc-500">User lifecycle volume by status, {LIFECYCLE_RANGE_LABELS[lifecycleRange]}</p>
          <select
            value={lifecycleRange}
            onChange={(e) => setLifecycleRange(e.target.value as LifecycleRange)}
            className="ml-auto rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20"
            aria-label="User lifecycle range"
          >
            <option value="7d">7 days</option>
            <option value="14d">14 days</option>
            <option value="1m">1 month</option>
            <option value="3m">3 months</option>
            <option value="6m">6 months</option>
            <option value="1y">1 year</option>
          </select>
        </div>

        {analyticsErrorMessage ? (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{analyticsErrorMessage}</div>
        ) : null}

        <div className="mb-3 flex flex-wrap gap-4 text-xs text-zinc-500">
          <span>Total Created: {displayedTotals.created}</span>
          <span>Total Deleted: {displayedTotals.deleted}</span>
          <span>Total Revoked: {displayedTotals.revoked}</span>
        </div>

        <div className="h-[180px] w-full">
          {analyticsLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">Loading analytics...</div>
          ) : lifecycleSeries.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">No user activity in this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lifecycleSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...chartTheme.grid} vertical={false} />
                <XAxis dataKey="label" tick={chartTheme.axis.tick} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
                <YAxis tick={chartTheme.axis.tick} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={chartTheme.tooltip.contentStyle} />
                <Bar dataKey="CREATED" stackId="a" fill="#09090b" />
                <Bar dataKey="REVOKED" stackId="a" fill="#f59e0b" />
                <Bar dataKey="DELETED" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <div className="flex flex-wrap gap-2 items-center border-b border-zinc-100 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {([
              ["ALL", "All"],
              ["ACTIVE", "Active"],
              ["RESTRICTED", "Restricted"],
              ["INACTIVE", "Inactive"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`rounded-full px-3 py-1 text-xs transition-colors ${statusTab === k ? "bg-zinc-950 text-white" : "text-zinc-500 hover:bg-zinc-100"}`}
                onClick={() => setStatusTab(k)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="ml-3 flex flex-wrap gap-2">
            {([
              ["ALL", "All"],
              ["USER", "Users"],
              ["ADMIN", "Admins"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${roleTab === k ? "bg-zinc-950 border-zinc-950 text-white" : "border-zinc-200 text-zinc-500 hover:bg-zinc-100"}`}
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

        {usersErrorMessage ? (
          <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{usersErrorMessage}</div>
        ) : null}

        {actionError ? (
          <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div>
        ) : null}

        <div className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">User</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">Role</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">Status</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500 text-right">Balance</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">Last login</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-zinc-400">Loading users...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-zinc-400">No users found matching the selected filters.</td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.userId} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-600">
                          {u.profileImage ? <img src={u.profileImage} alt="" className="size-8 rounded-full object-cover" /> : avatarInitials(u)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-zinc-900">{u.fullName}</div>
                          <div className="text-xs text-zinc-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={getRole(u)}
                        onValueChange={(value) => {
                          const nextRole = value as UserRole;
                          const currentRole = getRole(u);
                          if (nextRole === currentRole) return;
                          setPendingChange({ userId: u.userId, field: "role", from: currentRole, to: nextRole });
                        }}
                      >
                        <SelectTrigger className="h-8 w-[110px] rounded-lg border-zinc-200 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {USER_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={getStatus(u)}
                        onValueChange={(value) => {
                          const nextStatus = value as UserStatus;
                          const currentStatus = getStatus(u);
                          if (nextStatus === currentStatus) return;
                          setPendingChange({ userId: u.userId, field: "status", from: currentStatus, to: nextStatus });
                        }}
                      >
                        <SelectTrigger className="h-8 w-[130px] rounded-lg border-zinc-200 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {USER_STATUSES.map((statusValue) => (
                            <SelectItem key={statusValue} value={statusValue}>{statusValue}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      <span className={(metaByUserId.get(u.userId)?.balance ?? 0) <= 0 ? "text-red-600" : "text-zinc-500"}>
                        {formatNPR(metaByUserId.get(u.userId)?.balance ?? 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {formatRelative(metaByUserId.get(u.userId)?.lastLogin ? new Date(metaByUserId.get(u.userId)!.lastLogin as string) : null)}
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

      <AlertDialog open={pendingChange != null} onOpenChange={(open) => { if (!open) setPendingChange(null); }}>
        <AlertDialogContent className="rounded-2xl border border-zinc-200 p-0">
          <AlertDialogHeader className="items-start px-4 pt-4 text-left">
            <AlertDialogTitle>
              {pendingChange?.field === "role" ? "Confirm role update" : "Confirm status update"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingChange
                ? `Review the change for ${pendingUser?.fullName ?? `user #${pendingChange.userId}`}. This will update the selected ${pendingChange.field} immediately.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingChange ? (
            <div className="relative mx-4 my-3 rounded-xl border border-zinc-200 bg-zinc-50 py-5 px-3 text-xs">
              <span className="absolute -top-2 left-3 bg-zinc-50 px-1 text-[9px] font-medium uppercase tracking-wide text-zinc-500">Change summary</span>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-zinc-500">Current</span>
                  <span className="inline-flex rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700">{pendingChange.from}</span>
                </div>
                <div className="h-4 w-px bg-zinc-200" />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-zinc-700">New</span>
                  <span className="inline-flex rounded-md border border-zinc-900 bg-zinc-950 px-2.5 py-1 text-sm font-semibold text-white">{pendingChange.to}</span>
                </div>
              </div>
            </div>
          ) : null}
          <AlertDialogFooter className="!mx-0 !mb-0 rounded-b-2xl border-zinc-100 bg-zinc-50 px-4 py-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-zinc-950 text-white hover:bg-zinc-900" onClick={applyPendingChange}>
              Yes, update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

