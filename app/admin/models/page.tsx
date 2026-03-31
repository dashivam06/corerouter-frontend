"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { adminFetchModels } from "@/lib/admin-api";
import { formatRelative } from "@/lib/formatters";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
function usernamePill(username: string) {
  return (
    <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
      {username}
    </span>
  );
}

export default function AdminModelsPage() {
  const { data: models } = useQuery({
    queryKey: ["admin-models"],
    queryFn: adminFetchModels,
  });

  const list = models ?? [];
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (m) =>
        m.fullname.toLowerCase().includes(s) ||
        m.username.toLowerCase().includes(s) ||
        m.provider.toLowerCase().includes(s)
    );
  }, [list, q]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-950">Models</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage model publication status and billing configuration.
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[220px]">
            <p className="text-sm font-medium text-zinc-900">
              Search and review available models.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Update, deprecate, and audit changes from the model detail page.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search fullname or username..."
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 sm:w-80 lg:w-72"
            />
            <Link
              href="/admin/models/create"
              className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900"
            >
              + Add model
            </Link>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-zinc-200 bg-white py-20">
          <p className="text-base font-semibold text-zinc-900">No models found</p>
          <p className="mt-1 text-sm text-zinc-500">Try a different search.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="min-w-[980px] w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/70 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Billing</th>
                <th className="px-4 py-3">Docs</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.model_id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="px-4 py-3 align-top text-zinc-600">{m.provider}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="text-[14px] font-medium text-zinc-900">
                      {m.fullname}
                    </div>
                    <div className="mt-1">{usernamePill(m.username)}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={m.type} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-zinc-600">
                    Missing
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-zinc-500">
                    None
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-zinc-400">
                    {formatRelative(new Date(m.updated_at))}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="rounded-md p-2 text-zinc-400 outline-none hover:bg-zinc-50 hover:text-zinc-700"
                        aria-label="Model actions"
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem
                          onClick={() => {
                            window.location.href = `/admin/models/${m.model_id}`;
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          Deprecate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

