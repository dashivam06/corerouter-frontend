"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldAlert,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminStatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  adminFetchServiceTokens,
} from "@/lib/admin-api";
import { formatRelative } from "@/lib/formatters";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { OneTimeRevealModal } from "@/components/shared/one-time-reveal-modal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function AdminWorkersPage() {
  const { data: tokens } = useQuery({
    queryKey: ["admin-service-tokens"],
    queryFn: adminFetchServiceTokens,
  });

  const tokenList = tokens ?? [];

  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [tokenRole, setTokenRole] = useState<"WORKER" | "ANALYTICS" | "ADMIN">("WORKER");
  const [revealOpen, setRevealOpen] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const roleTabs = ["ALL", "WORKER", "ANALYTICS", "ADMIN"] as const;
  const [roleFilter, setRoleFilter] = useState<(typeof roleTabs)[number]>("ALL");

  const filteredTokens = useMemo(() => {
    if (roleFilter === "ALL") return tokenList;
    return tokenList.filter((t) => t.role === roleFilter);
  }, [tokenList, roleFilter]);

  return (
    <div>
      <AdminHeader
        title="Service Tokens"
        subtitle="Issue and manage operator access tokens (mock UI)"
      />

      <div>
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(() => {
            const total = tokenList.length;
            const active = tokenList.filter((t) => t.active).length;
            const inactive = total - active;
            return (
              <>
                <AdminStatCard
                  label="Total tokens"
                  value={total}
                  className="border-zinc-950 bg-zinc-950"
                  labelClassName="text-zinc-300"
                  valueClassName="text-white"
                />
                <AdminStatCard label="Active" value={active} />
                <AdminStatCard label="Inactive" value={inactive} />
              </>
            );
          })()}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {roleTabs.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                    roleFilter === r
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-500 hover:bg-zinc-100"
                  }`}
                >
                  {r === "ALL" ? "All" : r}
                </button>
              ))}
            </div>
            <Button
              type="button"
              className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs text-white hover:bg-zinc-900"
              onClick={() => setTokenDialogOpen(true)}
            >
              Create token
            </Button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  Name
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  Role
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  Active
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  token_id
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  Last used
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  Created
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTokens.map((t) => (
                <tr key={String(t.id)} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-zinc-900 flex items-center gap-2">
                      {t.role === "ADMIN" ? <ShieldAlert className="size-4 text-amber-600" /> : null}
                      {t.name}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.role} />
                  </td>
                  <td className="px-4 py-3">
                    <Switch checked={t.active} onCheckedChange={() => {}} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                    {t.token_id}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {t.last_used_at ? formatRelative(new Date(t.last_used_at)) : "Never"}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-sm text-zinc-500 hover:underline"
                        onClick={() => {
                          setSecret(`tok_secret_${t.token_id}`);
                          setRevealOpen(true);
                        }}
                      >
                        Rotate
                      </button>
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:underline"
                      onClick={() => setDeleteId(t.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTokens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-zinc-400">
                    No tokens.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue token dialog */}
      <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl border border-zinc-200 shadow-none">
          <DialogHeader>
            <DialogTitle>Issue new token</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="tok-name">Name</Label>
              <Input
                id="tok-name"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="mt-2 rounded-xl"
              />
            </div>

            <div>
              <Label>Role</Label>
              <Select value={tokenRole} onValueChange={(v) => setTokenRole(v as any)}>
                <SelectTrigger className="mt-2 h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="WORKER">WORKER</SelectItem>
                  <SelectItem value="ANALYTICS">ANALYTICS</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
              {tokenRole === "ADMIN" ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Admin tokens have full system access. Issue with caution.
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTokenDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-zinc-950 text-white hover:bg-zinc-900"
              onClick={() => {
                const s = `tok_secret_${tokenName || "token"}_${Date.now()}`;
                setSecret(s);
                setRevealOpen(true);
                setTokenDialogOpen(false);
                setTokenName("");
              }}
            >
              Create token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OneTimeRevealModal
        open={revealOpen}
        secret={secret}
        onAcknowledge={() => {
          setRevealOpen(false);
          setSecret(null);
        }}
      />

      <AlertDialog open={deleteId != null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this token?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the token from the system. (Mock UI)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-white hover:bg-red-600" onClick={() => setDeleteId(null)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

