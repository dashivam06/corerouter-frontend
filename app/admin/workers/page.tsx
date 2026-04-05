"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminStatCard } from "@/components/admin/stat-card";
import {
  adminActivateServiceToken,
  adminCreateServiceToken,
  adminDeleteServiceToken,
  adminFetchServiceTokens,
  adminRevokeServiceToken,
  type AdminServiceTokenView,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogDescription,
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
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type ServiceTokenRole = "WORKER" | "ANALYTICS" | "ADMIN";

type UiMessage = {
  tone: "success" | "error";
  text: string;
};

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLastUsed(value: string | null): string {
  if (!value) {
    return "Never used";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Never used";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    const minutes = Math.max(diffMinutes, 1);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncateTokenId(tokenId: string): string {
  if (tokenId.length <= 10) {
    return tokenId;
  }
  return `${tokenId.slice(0, 8)}...`;
}

function roleBadge(role: string): string {
  if (role === "WORKER") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function roleLabel(role: string): string {
  if (role === "WORKER") {
    return "Worker";
  }
  return role;
}

function activeBadge(active: boolean): { className: string; label: string } {
  if (active) {
    return {
      className: "border-green-200 bg-green-50 text-green-700",
      label: "Active",
    };
  }
  return {
    className: "border-red-200 bg-red-50 text-red-700",
    label: "Revoked",
  };
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 403) return "You don't have permission to perform this action.";
    if (error.status === 429) return "Too many requests. Please slow down.";
    if (error.status === 503) return "Service temporarily unavailable. Try again later.";
    if (error.status === 0) return "Unable to connect. Check your internet connection.";
    if (error.status >= 500) return "Something went wrong. Please try again.";
    return error.message || fallback;
  }
  return fallback;
}

export default function AdminWorkersPage() {
  const queryClient = useQueryClient();
  const { data: tokens, isLoading, error } = useQuery({
    queryKey: ["admin-service-tokens"],
    queryFn: adminFetchServiceTokens,
  });

  const tokenList = tokens ?? [];

  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [tokenRole, setTokenRole] = useState<ServiceTokenRole>("WORKER");
  const [createErrors, setCreateErrors] = useState<{ name?: string; role?: string; form?: string }>({});

  const [revealToken, setRevealToken] = useState<string | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [message, setMessage] = useState<UiMessage | null>(null);
  const [createLoading, setCreateLoading] = useState(false);

  const [removedTokenIds, setRemovedTokenIds] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<{
    tokenId: string;
    name: string;
    type: "revoke" | "delete";
  } | null>(null);
  const [actionLoadingTokenId, setActionLoadingTokenId] = useState<string | null>(null);

  const roleTabs = useMemo(() => {
    const set = new Set<string>(["WORKER"]);
    for (const token of tokenList) {
      set.add(token.role);
    }
    return ["ALL", ...Array.from(set)] as const;
  }, [tokenList]);

  const [roleFilter, setRoleFilter] = useState<(typeof roleTabs)[number]>("ALL");

  const filteredTokens = useMemo(() => {
    const visible = tokenList.filter((token) => !removedTokenIds.has(token.tokenId));
    if (roleFilter === "ALL") return visible;
    return visible.filter((t) => t.role === roleFilter);
  }, [tokenList, roleFilter, removedTokenIds]);

  function setTokens(next: (current: AdminServiceTokenView[]) => AdminServiceTokenView[]) {
    queryClient.setQueryData<AdminServiceTokenView[]>(["admin-service-tokens"], (current) => {
      return next(current ?? []);
    });
  }

  async function handleCreateToken() {
    setCreateLoading(true);
    setCreateErrors({});
    setMessage(null);

    try {
      const created = await adminCreateServiceToken({
        name: tokenName.trim(),
        role: tokenRole,
      });

      setTokens((current) => {
        const deduped = current.filter((item) => item.tokenId !== created.tokenId);
        return [
          {
            id: created.id,
            tokenId: created.tokenId,
            name: created.name,
            role: created.role,
            active: created.active,
            createdAt: created.createdAt,
            lastUsedAt: created.lastUsedAt,
          },
          ...deduped,
        ];
      });

      setRemovedTokenIds((current) => {
        const next = new Set(current);
        next.delete(created.tokenId);
        return next;
      });

      setRevealToken(created.rawToken);
      setCopied(false);
      setRevealOpen(true);

      setTokenDialogOpen(false);
      setTokenName("");
      setMessage({ tone: "success", text: "Service token created successfully." });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const lower = err.message.toLowerCase();
        const nextErrors: { name?: string; role?: string; form?: string } = {};

        if (err.fieldErrors.name) nextErrors.name = err.fieldErrors.name;
        if (err.fieldErrors.role) nextErrors.role = err.fieldErrors.role;

        if (err.status === 409 || lower.includes("already exists")) {
          nextErrors.name = "A token with this name already exists.";
        } else if (err.status === 500 && lower.includes("unable to generate a unique service token id")) {
          nextErrors.form = "Token generation failed. Please try again.";
        } else if (err.status === 500) {
          nextErrors.form = "Failed to create service token. Please try again.";
        } else if (err.status === 403) {
          nextErrors.form = "You don't have permission to perform this action.";
        } else if (err.status === 429) {
          nextErrors.form = "Too many requests. Please slow down.";
        } else if (err.status === 503) {
          nextErrors.form = "Service temporarily unavailable. Try again later.";
        } else if (err.status === 0) {
          nextErrors.form = "Unable to connect. Check your internet connection.";
        } else if (!nextErrors.form) {
          nextErrors.form = err.message || "Failed to create service token. Please try again.";
        }

        setCreateErrors(nextErrors);
        return;
      }

      setCreateErrors({ form: "Failed to create service token. Please try again." });
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleActivate(token: AdminServiceTokenView) {
    setActionLoadingTokenId(token.tokenId);
    setMessage(null);

    try {
      await adminActivateServiceToken(token.tokenId);
      setTokens((current) =>
        current.map((item) =>
          item.tokenId === token.tokenId ? { ...item, active: true } : item
        )
      );
      setMessage({ tone: "success", text: "Service token activated." });
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setTokens((current) => current.filter((item) => item.tokenId !== token.tokenId));
        setMessage({ tone: "error", text: "Service token not found." });
        return;
      }
      setMessage({ tone: "error", text: normalizeErrorMessage(err, "Failed to activate service token.") });
    } finally {
      setActionLoadingTokenId(null);
    }
  }

  async function handleConfirmPendingAction() {
    if (!pendingAction) {
      return;
    }

    const target = pendingAction;
    setActionLoadingTokenId(target.tokenId);
    setPendingAction(null);
    setMessage(null);

    try {
      if (target.type === "revoke") {
        await adminRevokeServiceToken(target.tokenId);
        setTokens((current) =>
          current.map((item) =>
            item.tokenId === target.tokenId ? { ...item, active: false } : item
          )
        );
        setMessage({ tone: "success", text: "Service token revoked." });
      } else {
        await adminDeleteServiceToken(target.tokenId);
        setRemovedTokenIds((current) => new Set(current).add(target.tokenId));
        setMessage({ tone: "success", text: "Service token deleted." });
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        if (target.type === "delete") {
          setRemovedTokenIds((current) => new Set(current).add(target.tokenId));
        } else {
          setTokens((current) => current.filter((item) => item.tokenId !== target.tokenId));
        }
        setMessage({ tone: "error", text: "Service token not found." });
        return;
      }

      setMessage({
        tone: "error",
        text:
          target.type === "revoke"
            ? normalizeErrorMessage(err, "Failed to revoke service token.")
            : normalizeErrorMessage(err, "Failed to delete service token."),
      });
    } finally {
      setActionLoadingTokenId(null);
    }
  }

  async function handleCopyToken() {
    if (!revealToken) {
      return;
    }
    try {
      await navigator.clipboard.writeText(revealToken);
      setCopied(true);
    } catch {
      setMessage({ tone: "error", text: "Unable to copy token. Please copy it manually." });
    }
  }

  return (
    <div>
      <AdminHeader
        title="Service Tokens"
        subtitle="Issue and manage internal worker service tokens"
      />

      <div>
        {message ? (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              message.tone === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(() => {
            const visibleTokens = tokenList.filter((t) => !removedTokenIds.has(t.tokenId));
            const total = visibleTokens.length;
            const active = visibleTokens.filter((t) => t.active).length;
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
                  {r === "ALL" ? "All" : roleLabel(r)}
                </button>
              ))}
            </div>
            <Button
              type="button"
              className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs text-white hover:bg-zinc-900"
              onClick={() => {
                setCreateErrors({});
                setTokenDialogOpen(true);
              }}
            >
              Create token
            </Button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  name
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  tokenId
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  role
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  active
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  lastUsedAt
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  createdAt
                </th>
                <th className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
                  actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-zinc-400">
                    Loading service tokens...
                  </td>
                </tr>
              ) : null}
              {!isLoading && error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-red-600">
                    {normalizeErrorMessage(error, "Failed to load service tokens.")}
                  </td>
                </tr>
              ) : null}
              {filteredTokens.map((t) => (
                <tr key={t.tokenId} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-zinc-900">
                      {t.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                    <span title={t.tokenId}>{truncateTokenId(t.tokenId)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleBadge(t.role)}`}>
                      {roleLabel(t.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const badge = activeBadge(t.active);
                      return (
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {formatLastUsed(t.lastUsedAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {formatCreatedAt(t.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {t.active ? (
                        <button
                          type="button"
                          className="text-sm text-zinc-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={actionLoadingTokenId === t.tokenId}
                          onClick={() =>
                            setPendingAction({
                              tokenId: t.tokenId,
                              name: t.name,
                              type: "revoke",
                            })
                          }
                        >
                          Revoke
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-sm text-zinc-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={actionLoadingTokenId === t.tokenId}
                          onClick={() => handleActivate(t)}
                        >
                          Activate
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={actionLoadingTokenId === t.tokenId}
                        onClick={() =>
                          setPendingAction({
                            tokenId: t.tokenId,
                            name: t.name,
                            type: "delete",
                          })
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !error && filteredTokens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-zinc-400">
                    No service tokens found.
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
              {createErrors.name ? (
                <p className="mt-2 text-sm text-red-600">{createErrors.name}</p>
              ) : null}
            </div>

            <div>
              <Label>Role</Label>
              <Select value={tokenRole} onValueChange={(v) => setTokenRole(v as ServiceTokenRole)}>
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
              {createErrors.role ? (
                <p className="mt-2 text-sm text-red-600">{createErrors.role}</p>
              ) : null}
            </div>

            {createErrors.form ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createErrors.form}
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={createLoading}
              onClick={() => setTokenDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-zinc-950 text-white hover:bg-zinc-900"
              disabled={createLoading}
              onClick={handleCreateToken}
            >
              {createLoading ? "Creating..." : "Create token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={revealOpen && !!revealToken}
        onOpenChange={(open) => {
          if (!open) {
            setRevealOpen(false);
            setRevealToken(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-none ring-1 ring-zinc-200"
        >
          <DialogHeader>
            <DialogTitle className="text-lg text-zinc-950">Service token generated</DialogTitle>
            <DialogDescription className="text-sm text-zinc-600">
              Copy your token and use it in your worker service.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <Input
              readOnly
              value={revealToken ?? ""}
              className="h-11 rounded-xl border-zinc-200 bg-white font-mono text-sm text-zinc-950"
              aria-label="Generated service token"
            />

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-zinc-200"
                onClick={handleCopyToken}
              >
                {copied ? "Copied" : "Copy"}
              </Button>

              <Button
                type="button"
                className="rounded-xl bg-zinc-950 text-white hover:bg-zinc-900"
                onClick={() => {
                  setRevealOpen(false);
                  setRevealToken(null);
                  setCopied(false);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingAction != null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl border border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === "delete" ? "Delete this service token?" : "Revoke this service token?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === "delete"
                ? "This action cannot be undone. Any worker service using it will immediately lose access."
                : "Worker services using it will lose access immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-white hover:bg-red-600" onClick={handleConfirmPendingAction}>
              {pendingAction?.type === "delete" ? "Delete" : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

