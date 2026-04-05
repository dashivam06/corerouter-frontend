"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Key, Loader2, MoreHorizontal } from "lucide-react";
import { UserHeader } from "@/components/layout/user-header";
import {
  ApiRequestError,
  createApiKey,
  deleteApiKey,
  deactivateApiKey,
  enableApiKey,
  fetchApiKeys,
  updateApiKey,
  type ApiKeyRecord,
} from "@/lib/api";
import { StatusBadge } from "@/components/shared/status-badge";
import { MaskedKey } from "@/components/shared/masked-key";
import { OneTimeRevealModal } from "@/components/shared/one-time-reveal-modal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { formatRelative } from "@/lib/formatters";

type FieldErrors = Record<string, string>;

function getFieldErrors(error: unknown): FieldErrors {
  if (error instanceof ApiRequestError) {
    return error.fieldErrors;
  }

  return {};
}

function formatError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 403) {
      return "You don't have permission to perform this action.";
    }

    if (error.message) {
      return error.message;
    }
  }

  return "Unable to save API key changes right now. Please try again.";
}

export default function ApiKeysPage() {
  const qc = useQueryClient();
  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchApiKeys,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [reveal, setReveal] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyRecord | null>(null);
  const [editTarget, setEditTarget] = useState<ApiKeyRecord | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editDailyLimit, setEditDailyLimit] = useState("");
  const [editMonthlyLimit, setEditMonthlyLimit] = useState("");
  const [createFieldErrors, setCreateFieldErrors] = useState<FieldErrors>({});
  const [editFieldErrors, setEditFieldErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const noticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!notice) {
      return;
    }

    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }

    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 4000);

    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = null;
      }
    };
  }, [notice]);

  function showNotice(kind: "success" | "error", message: string) {
    setNotice({ kind, message });
  }

  const openCreateDialog = () => {
    setDesc("");
    setDailyLimit("");
    setMonthlyLimit("");
    setCreateFieldErrors({});
    setCreateOpen(true);
  };

  const openEditDialog = (key: ApiKeyRecord) => {
    setEditTarget(key);
    setEditDesc(key.description ?? "");
    setEditDailyLimit(String(key.dailyLimit ?? ""));
    setEditMonthlyLimit(String(key.monthlyLimit ?? ""));
    setEditFieldErrors({});
  };

  const closeEditDialog = () => {
    setEditTarget(null);
    setEditDesc("");
    setEditDailyLimit("");
    setEditMonthlyLimit("");
    setEditFieldErrors({});
  };

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected =
    !!keys?.length && keys.every((k) => selectedSet.has(k.apiKeyId));

  const createMut = useMutation({
    mutationFn: () =>
      createApiKey({
        description: desc.trim(),
        dailyLimit: Number(dailyLimit),
        monthlyLimit: Number(monthlyLimit),
      }),
    onSuccess: (k) => {
      qc.setQueryData<ApiKeyRecord[]>(["api-keys"], (current) => {
        const items = current ?? [];
        return [k, ...items.filter((item) => item.apiKeyId !== k.apiKeyId)];
      });
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setCreateOpen(false);
      setDesc("");
      setDailyLimit("");
      setMonthlyLimit("");
      setCreateFieldErrors({});
      setReveal(k.key);
      showNotice("success", "API key generated successfully.");
    },
    onError: (error) => {
      const fieldErrors = getFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        setCreateFieldErrors(fieldErrors);
        return;
      }

      showNotice("error", formatError(error));
    },
  });

  const updateMut = useMutation({
    mutationFn: () => {
      if (!editTarget) {
        throw new Error("Missing API key selection");
      }

      const payload: { description?: string; dailyLimit?: number; monthlyLimit?: number } = {};
      const nextDescription = editDesc.trim();
      const nextDailyLimit = Number(editDailyLimit);
      const nextMonthlyLimit = Number(editMonthlyLimit);

      if (nextDescription !== (editTarget.description ?? "")) {
        payload.description = nextDescription;
      }

      if (nextDailyLimit !== editTarget.dailyLimit) {
        payload.dailyLimit = nextDailyLimit;
      }

      if (nextMonthlyLimit !== editTarget.monthlyLimit) {
        payload.monthlyLimit = nextMonthlyLimit;
      }

      return updateApiKey(editTarget.apiKeyId, payload);
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      qc.setQueryData<ApiKeyRecord[]>(["api-keys"], (current) => {
        const items = current ?? [];
        return items.map((item) => (item.apiKeyId === updated.apiKeyId ? updated : item));
      });
      closeEditDialog();
      showNotice("success", "API key updated.");
    },
    onError: (error) => {
      const fieldErrors = getFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        setEditFieldErrors(fieldErrors);
        return;
      }

      showNotice("error", formatError(error));
    },
  });

  const delMut = useMutation({
    mutationFn: (id: number) => deleteApiKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setDeleteTarget(null);
      showNotice("success", "API key deleted.");
    },
    onError: (error) => {
      showNotice("error", formatError(error));
    },
  });

  const deactMut = useMutation({
    mutationFn: (id: number) => deactivateApiKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      showNotice("success", "API key disabled.");
    },
    onError: (error) => {
      showNotice("error", formatError(error));
    },
  });

  const activateMut = useMutation({
    mutationFn: (id: number) => enableApiKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      showNotice("success", "API key enabled.");
    },
    onError: (error) => {
      showNotice("error", formatError(error));
    },
  });

  const bulkDeactMut = useMutation({
    mutationFn: (ids: number[]) =>
      Promise.all(ids.map((id) => deactivateApiKey(id))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setSelectedIds([]);
      showNotice("success", "Selected API keys disabled.");
    },
    onError: (error) => {
      showNotice("error", formatError(error));
    },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (ids: number[]) =>
      Promise.all(ids.map((id) => deleteApiKey(id))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setSelectedIds([]);
      showNotice("success", "Selected API keys deleted.");
    },
    onError: (error) => {
      showNotice("error", formatError(error));
    },
  });

  return (
    <>
      <UserHeader
        title="Your API keys"
        // subtitle="Manage your keys to access all models?"
      >
        <Button
          type="button"
          className="rounded-xl bg-zinc-950 px-8 py-5 text-sm text-white hover:bg-zinc-900"
          onClick={openCreateDialog}
        >
          Create New key
        </Button>
      </UserHeader>

      {notice ? (
        <div
          className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
            notice.kind === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-900">
              Create and manage your API keys.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Select keys and run collective operations in one place.
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                aria-label="API key help"
                className="inline-flex size-7 items-center justify-center rounded-full border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                ?
              </TooltipTrigger>
              <TooltipContent className="max-w-sm text-left leading-relaxed" side="left">
                <div className="space-y-1">
                  <p>Apps can create keys for you, or you can create them yourself.</p>
                  <p>&quot;Limit&quot; tells you how many credits the key is allowed to use.</p>
                  <p>To add credits to your account, go to the credits page.</p>
                  <p>Create and manage your API keys.</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-20 text-zinc-500">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : !keys?.length ? (
        <div className="flex flex-col items-center rounded-2xl border border-zinc-200 bg-white py-20">
          <Key className="mb-4 size-10 text-zinc-300" />
          <p className="text-base font-semibold text-zinc-900">
            No API keys yet
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Create a key to start making requests
          </p>
          <Button
            type="button"
            className="mt-4 rounded-xl bg-zinc-950 px-4 py-2 text-sm text-white"
            onClick={openCreateDialog}
          >
            Create your first key
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
            <p className="text-sm text-zinc-600">
              {selectedIds.length} selected out of {keys.length}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-lg"
                disabled={selectedIds.length === 0 || bulkDeactMut.isPending}
                onClick={() => bulkDeactMut.mutate(selectedIds)}
              >
                {bulkDeactMut.isPending ? "Deactivating..." : "Deactivate selected"}
              </Button>
              <Button
                variant="outline"
                className="h-9 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                disabled={selectedIds.length === 0 || bulkDeleteMut.isPending}
                onClick={() => bulkDeleteMut.mutate(selectedIds)}
              >
                {bulkDeleteMut.isPending ? "Deleting..." : "Delete selected"}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
            <table className="min-w-[980px] w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all API keys"
                      checked={allSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(keys.map((k) => k.apiKeyId));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      className="size-4 rounded border-zinc-300"
                    />
                  </th>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Daily limit</th>
                  <th className="px-4 py-3">Monthly limit</th>
                  <th className="px-4 py-3">Last used</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr
                    key={k.apiKeyId}
                    className={`border-b border-zinc-100 last:border-0 ${
                      k.status === "REVOKED" || k.status === "EXPIRED"
                        ? "bg-zinc-50/70"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        aria-label={`Select ${k.description}`}
                        checked={selectedSet.has(k.apiKeyId)}
                        onChange={(e) => {
                          setSelectedIds((prev) => {
                            if (e.target.checked) return [...prev, k.apiKeyId];
                            return prev.filter((id) => id !== k.apiKeyId);
                          });
                        }}
                        className="size-4 rounded border-zinc-300"
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-[14px] font-medium text-zinc-900">{k.description}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusBadge status={k.status} />
                        <MaskedKey fullKey={k.key} />
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-xs text-zinc-600">
                        {k.dailyLimit.toLocaleString()} / day
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-xs text-zinc-600">
                        {k.monthlyLimit.toLocaleString()} / month
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-zinc-600">
                      {k.lastUsedAt
                        ? formatRelative(new Date(k.lastUsedAt))
                        : "Never used"}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-zinc-600">
                      {format(new Date(k.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      {k.status === "ACTIVE" || k.status === "INACTIVE" ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="rounded-md p-2 text-zinc-400 outline-none hover:bg-zinc-50 hover:text-zinc-700"
                            aria-label="Key actions"
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            {k.status === "ACTIVE" ? (
                              <DropdownMenuItem onClick={() => deactMut.mutate(k.apiKeyId)}>
                                Disable
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => activateMut.mutate(k.apiKeyId)}>
                                Enable
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEditDialog(k)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteTarget(k)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-xs text-zinc-400">No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-zinc-200 shadow-none">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-zinc-950">
              Create new API key
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="key-desc">Description</Label>
            <Input
              id="key-desc"
              placeholder="e.g. Production server, Development..."
              value={desc}
              onChange={(e) => {
                setDesc(e.target.value);
                if (createFieldErrors.description) {
                  setCreateFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.description;
                    return next;
                  });
                }
              }}
              className="rounded-xl"
            />
            {createFieldErrors.description ? (
              <p className="text-xs text-red-600">{createFieldErrors.description}</p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="daily-limit">Daily limit</Label>
                <Input
                  id="daily-limit"
                  type="number"
                  min="1"
                  step="1"
                  value={dailyLimit}
                  onChange={(e) => {
                    setDailyLimit(e.target.value);
                    if (createFieldErrors.dailyLimit) {
                      setCreateFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.dailyLimit;
                        return next;
                      });
                    }
                  }}
                  className="rounded-xl"
                  placeholder="e.g. 5000"
                />
                {createFieldErrors.dailyLimit ? (
                  <p className="text-xs text-red-600">{createFieldErrors.dailyLimit}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly-limit">Monthly limit</Label>
                <Input
                  id="monthly-limit"
                  type="number"
                  min="1"
                  step="1"
                  value={monthlyLimit}
                  onChange={(e) => {
                    setMonthlyLimit(e.target.value);
                    if (createFieldErrors.monthlyLimit) {
                      setCreateFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.monthlyLimit;
                        return next;
                      });
                    }
                  }}
                  className="rounded-xl"
                  placeholder="e.g. 100000"
                />
                {createFieldErrors.monthlyLimit ? (
                  <p className="text-xs text-red-600">{createFieldErrors.monthlyLimit}</p>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-zinc-500 font-montserrat mt-3">
              Set the usage caps for this key before creating it.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setDesc("");
                setDailyLimit("");
                setMonthlyLimit("");
                setCreateFieldErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-zinc-950 text-white hover:bg-zinc-900"
              disabled={
                createMut.isPending ||
                desc.trim() === "" ||
                dailyLimit.trim() === "" ||
                monthlyLimit.trim() === ""
              }
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "Creating…" : "Create key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
        <DialogContent className="max-w-md rounded-2xl border border-zinc-200 shadow-none">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-zinc-950">
              Edit API key
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="edit-key-desc">Description</Label>
            <Input
              id="edit-key-desc"
              placeholder="e.g. Production server, Development..."
              value={editDesc}
              onChange={(e) => {
                setEditDesc(e.target.value);
                if (editFieldErrors.description) {
                  setEditFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.description;
                    return next;
                  });
                }
              }}
              className="rounded-xl"
            />
            {editFieldErrors.description ? (
              <p className="text-xs text-red-600">{editFieldErrors.description}</p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-daily-limit">Daily limit</Label>
                <Input
                  id="edit-daily-limit"
                  type="number"
                  min="1"
                  step="1"
                  value={editDailyLimit}
                  onChange={(e) => {
                    setEditDailyLimit(e.target.value);
                    if (editFieldErrors.dailyLimit) {
                      setEditFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.dailyLimit;
                        return next;
                      });
                    }
                  }}
                  className="rounded-xl"
                  placeholder="e.g. 5000"
                />
                {editFieldErrors.dailyLimit ? (
                  <p className="text-xs text-red-600">{editFieldErrors.dailyLimit}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-monthly-limit">Monthly limit</Label>
                <Input
                  id="edit-monthly-limit"
                  type="number"
                  min="1"
                  step="1"
                  value={editMonthlyLimit}
                  onChange={(e) => {
                    setEditMonthlyLimit(e.target.value);
                    if (editFieldErrors.monthlyLimit) {
                      setEditFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.monthlyLimit;
                        return next;
                      });
                    }
                  }}
                  className="rounded-xl"
                  placeholder="e.g. 100000"
                />
                {editFieldErrors.monthlyLimit ? (
                  <p className="text-xs text-red-600">{editFieldErrors.monthlyLimit}</p>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-zinc-500 font-montserrat mt-3">
              Leave a field unchanged if you do not want to modify it.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button
              className="bg-zinc-950 text-white hover:bg-zinc-900"
              disabled={
                updateMut.isPending ||
                !editTarget ||
                (editDesc.trim() === editTarget.description &&
                  editDailyLimit.trim() === String(editTarget.dailyLimit) &&
                  editMonthlyLimit.trim() === String(editTarget.monthlyLimit))
              }
              onClick={() => updateMut.mutate()}
            >
              {updateMut.isPending ? "Updating…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OneTimeRevealModal
        open={!!reveal}
        secret={reveal}
        onAcknowledge={() => setReveal(null)}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-2xl border border-zinc-200">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this API key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently revoke{" "}
              <span className="font-medium text-zinc-900">
                {deleteTarget?.description || "this API key"}
              </span>
              . It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-600"
              onClick={() => deleteTarget && delMut.mutate(deleteTarget.apiKeyId)}
            >
              Delete key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
