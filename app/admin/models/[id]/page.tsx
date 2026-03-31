"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronLeft, ChevronDown } from "lucide-react";
import {
  adminFetchModels,
  adminFetchTasks,
  adminFetchUsageRecords,
  adminFetchApiKeys,
} from "@/lib/admin-api";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminStatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { JsonTreeEditor } from "@/components/admin/json-tree-editor";
import { JsonPreview } from "@/components/admin/json-preview";
import { PricingCalculator } from "@/components/admin/pricing-calculator";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { formatRelative, formatNPR } from "@/lib/formatters";
import type { AdminModel, AdminTask, AdminUsageRecord } from "@/lib/admin-mock-data";
import { chartTheme } from "@/lib/charts";

export default function AdminModelDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: models } = useQuery({
    queryKey: ["admin-models-detail"],
    queryFn: adminFetchModels,
  });
  const { data: tasks } = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: adminFetchTasks,
  });
  const { data: usage } = useQuery({
    queryKey: ["admin-usage-records"],
    queryFn: adminFetchUsageRecords,
  });
  const { data: apiKeys } = useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: adminFetchApiKeys,
  });

  const modelId = Number(params.id);
  const model = useMemo(
    () => (models ?? []).find((m) => m.model_id === modelId) ?? null,
    [models, modelId]
  );

  const [identityOpen, setIdentityOpen] = useState(true);

  if (!model) {
    return (
      <div className="py-20 text-center text-sm text-zinc-500">
        Model not found.{" "}
        <Link href="/admin/models" className="text-zinc-900 underline">
          Back to models
        </Link>
      </div>
    );
  }

  const contextualAlert = "No billing config — cannot bill requests. Set up billing ↓";

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-8 bg-white border-b border-zinc-100 px-8 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[18px] font-semibold text-zinc-950">
              {model.fullname}
            </h1>
            <span className="font-mono text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-md">
              {model.username}
            </span>
            <span className="text-sm text-zinc-400">{model.provider}</span>
            <StatusBadge status={model.type} />
            <div className="inline-flex items-center gap-2">
              <StatusBadge status={model.status} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-zinc-400">
              Updated {formatRelative(new Date(model.updated_at))}
            </div>
            <Link
              href="/admin/models"
              className="text-sm text-zinc-400 hover:text-zinc-700"
            >
              ← Models
            </Link>
          </div>
        </div>
      </div>

      {/* Contextual alert strip */}
      <div className="mt-4 -mx-8 px-8">
        <div className="w-full rounded-none border border-zinc-200 bg-white px-6 py-3 text-sm text-zinc-700">
          {contextualAlert}
        </div>
      </div>

      {/* ZONE 1 usage overview */}
      <section className="mt-5">
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            label="Total requests this month"
            value="—"
          />
          <AdminStatCard
            label="Total cost billed (रू)"
            value={formatNPR(1250)}
          />
          <AdminStatCard
            label="Avg cost/request"
            value={formatNPR(0.42)}
          />
          <AdminStatCard
            label="Active API keys on this model"
            value="—"
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="mb-3 text-sm font-medium text-zinc-500">Daily cost stacked bar (30 days)</p>
            <div className="h-[220px] rounded-xl border border-zinc-200 bg-white" />
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="mb-3 text-sm font-medium text-zinc-500">Daily requests (30 days)</p>
            <div className="h-[220px] rounded-xl border border-zinc-200 bg-white" />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-xs text-zinc-500">Top API key by spend</div>
            <div className="mt-2 text-sm text-zinc-900">—</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-xs text-zinc-500">Top user by requests</div>
            <div className="mt-2 text-sm text-zinc-900">—</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-xs text-zinc-500">Dormant signal</div>
            <div className="mt-2 text-sm text-zinc-900">Stable usage ✓</div>
          </div>
        </div>
      </section>

      {/* ZONE 2 identity accordion */}
      <section className="mt-6 border-t border-zinc-100 pt-6">
        <button
          type="button"
          onClick={() => setIdentityOpen((o) => !o)}
          className="w-full flex items-center justify-between py-4 border-b border-zinc-100"
        >
          <div>
            <div className="text-[14px] font-semibold text-zinc-900">Identity</div>
            <div className="text-xs text-zinc-400">
              {model.provider} · {model.endpoint_url.slice(0, 26)}… · Created{" "}
              {formatRelative(new Date(model.created_at))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Edit</span>
            <ChevronDown className={`size-4 text-zinc-400 ${identityOpen ? "rotate-180" : ""}`} />
          </div>
        </button>

        {identityOpen ? (
          <div className="pb-6 pt-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-3">
                <div className="text-sm font-medium text-zinc-900">{model.fullname}</div>
                <div className="font-mono text-xs text-zinc-400">{model.username}</div>
                <div className="text-sm text-zinc-500">{model.provider}</div>
                <StatusBadge status={model.type} />
              </div>
              <div className="space-y-3">
                <StatusBadge status={model.status} />
                <div className="text-xs text-zinc-400">
                  Created: {new Date(model.created_at).toLocaleString()}
                </div>
                <div className="text-xs text-zinc-400">
                  Updated: {new Date(model.updated_at).toLocaleString()}
                </div>
                <div className="text-xs text-zinc-600">
                  Endpoint: {model.endpoint_url}
                </div>
                <button className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                  Test endpoint
                </button>
              </div>
              <div className="space-y-3">
                <div className="text-sm font-medium text-zinc-900">Description</div>
                <textarea
                  className="min-h-[120px] w-full rounded-xl border border-zinc-200 p-3 text-sm outline-none focus:border-zinc-400"
                  value={model.description}
                  readOnly
                />
                <JsonTreeEditor
                  value={model.metadata}
                  onChange={() => {}}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3 border-t border-zinc-100 pt-6">
              <button className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700">
                Cancel
              </button>
              <button className="rounded-xl bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-900">
                Save
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* ZONE 3 Documentation */}
      <section className="mt-6 border-t border-zinc-100 pt-6">
        <div className="rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="grid grid-cols-[200px_1fr] gap-0">
            <div className="bg-zinc-50 border-r border-zinc-200">
              <div className="px-4 py-3 text-sm text-zinc-400 border-b border-zinc-100">
                Overview
              </div>
              <div className="px-4 py-3 text-sm text-zinc-400 hover:text-zinc-700 cursor-pointer border-t border-zinc-100">
                + Add section
              </div>
            </div>
            <div className="bg-white p-6">
              <div className="text-sm font-medium text-zinc-900">Documentation editor</div>
              <div className="mt-4">
                <RichTextEditor value={""} onChange={() => {}} />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4">
                <div className="text-xs text-green-600">● Saved · 2 min ago</div>
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <span>Duplicate</span>
                  <span className="text-red-500">Delete section</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ZONE 4 Billing */}
      <section className="mt-6 border-t border-zinc-100 pt-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm font-semibold text-zinc-900">Billing configuration</div>
          </div>
          <div className="mt-5">
            <JsonTreeEditor value={{}} onChange={() => {}} />
          </div>
          <div className="mt-5">
            <PricingCalculator pricingType="PER_TOKEN" pricingMetadata={{ rates: {} }} />
          </div>
          <div className="mt-5">
            <JsonPreview value={{}} />
          </div>
        </div>
      </section>

      {/* ZONE 5 Change log */}
      <section className="mt-6 border-t border-zinc-100 pt-6 pb-6">
        <div className="text-sm font-semibold text-zinc-900 mb-3">Change log</div>
        <div className="space-y-2">
          {[
            "2026-03-01 — Billing updated",
            "2026-02-18 — Documentation added",
          ].map((t) => (
            <div key={t} className="text-sm text-zinc-600 py-2 border-b border-zinc-100">
              {t}
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-zinc-400">
          TODO: add changed_by field for full audit trail
        </div>
      </section>
    </div>
  );
}

