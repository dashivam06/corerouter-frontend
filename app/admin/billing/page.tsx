"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminStatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  adminCreateBillingConfig,
  adminDeleteBillingConfig,
  adminFetchBillingConfigs,
  adminFetchBillingInsights,
  adminFetchModels,
  adminUpdateBillingConfig,
} from "@/lib/admin-api";
import type { BillingConfigResponse, BillingPricingType, ModelResponse } from "@/lib/api";
import { formatNPR } from "@/lib/formatters";

type FormState = {
  modelId: string;
  pricingType: BillingPricingType;
  inputRate: string;
  outputRate: string;
  rate: string;
};

function parsePricingMetadata(metadata: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(metadata);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function formatConfigRate(config: BillingConfigResponse): string {
  const parsed = parsePricingMetadata(config.pricingMetadata);
  if (!parsed) return "Invalid config";

  if (config.pricingType === "PER_TOKEN") {
    const inputRate = typeof parsed.inputRate === "number" ? parsed.inputRate : Number(parsed.inputRate ?? 0);
    const outputRate = typeof parsed.outputRate === "number" ? parsed.outputRate : Number(parsed.outputRate ?? 0);
    return `Input: NPR ${inputRate.toFixed(5)} / Output: NPR ${outputRate.toFixed(5)}`;
  }

  const rate = typeof parsed.rate === "number" ? parsed.rate : Number(parsed.rate ?? 0);
  return `Rate: NPR ${rate.toFixed(5)}`;
}

function buildMetadata(form: FormState): string {
  if (form.pricingType === "PER_TOKEN") {
    return JSON.stringify({
      inputRate: Number(form.inputRate || 0),
      outputRate: Number(form.outputRate || 0),
    });
  }

  return JSON.stringify({ rate: Number(form.rate || 0) });
}

function emptyForm(): FormState {
  return {
    modelId: "",
    pricingType: "PER_TOKEN",
    inputRate: "0.00003",
    outputRate: "0.00006",
    rate: "0.001",
  };
}

export default function AdminBillingPage() {
  const queryClient = useQueryClient();
  const { data: insights } = useQuery({ queryKey: ["admin-billing-insights"], queryFn: adminFetchBillingInsights });
  const { data: configs } = useQuery({ queryKey: ["admin-billing-configs"], queryFn: adminFetchBillingConfigs });
  const { data: models } = useQuery({ queryKey: ["admin-models-for-billing"], queryFn: adminFetchModels });

  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingBillingId, setEditingBillingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const configList = configs ?? [];
  const modelList = models ?? [];

  const selectedModel = useMemo(
    () => modelList.find((model) => String(model.model_id) === form.modelId) ?? null,
    [modelList, form.modelId]
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const metadata = buildMetadata(form);
      if (!form.modelId) throw new Error("Model ID is required.");
      if (!selectedModel) throw new Error("Model not found. Check the model ID.");
      if (!metadata) throw new Error("Invalid pricing metadata.");

      if (editingBillingId) {
        return adminUpdateBillingConfig(editingBillingId, {
          pricingType: form.pricingType,
          pricingMetadata: metadata,
        });
      }

      return adminCreateBillingConfig({
        modelId: Number(form.modelId),
        pricingType: form.pricingType,
        pricingMetadata: metadata,
      });
    },
    onSuccess: async () => {
      setError(null);
      setEditingBillingId(null);
      setForm(emptyForm());
      await queryClient.invalidateQueries({ queryKey: ["admin-billing-configs"] });
    },
    onError: (err: any) => {
      setError(err instanceof Error ? err.message : "Failed to save billing config.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (billingId: number) => adminDeleteBillingConfig(billingId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-billing-configs"] });
    },
    onError: (err: any) => {
      setError(err instanceof Error ? err.message : "Failed to delete billing config.");
    },
  });

  const modelOptions = useMemo(() => modelList.slice().sort((a, b) => a.fullname.localeCompare(b.fullname)), [modelList]);

  return (
    <div className="space-y-6">
      <AdminHeader title="Billing Configs" subtitle="Billing insights and model pricing configuration" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminStatCard label="Total User Balance" value={formatNPR(insights?.totalBalance ?? 0)} />
        <AdminStatCard label="This Month's Volume" value={formatNPR(insights?.thisMonthVolume ?? 0)} />
        <AdminStatCard label="Today's Top-Ups" value={formatNPR(insights?.todayTopUpAmount ?? 0)} />
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950">
              {editingBillingId ? "Edit Billing Config" : "Create Billing Config"}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Select a model and serialize the pricing metadata before saving.
            </p>
          </div>
          {editingBillingId ? (
            <Button variant="outline" onClick={() => { setEditingBillingId(null); setForm(emptyForm()); }}>
              Cancel edit
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500">Model</label>
            <Select value={form.modelId} onValueChange={(value) => setForm((s) => ({ ...s, modelId: value ?? "" }))}>
              <SelectTrigger className="w-full rounded-xl border-zinc-200">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((model) => (
                  <SelectItem key={model.model_id} value={String(model.model_id)}>
                    {model.fullname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500">Pricing type</label>
            <Select value={form.pricingType} onValueChange={(value) => setForm((s) => ({ ...s, pricingType: value as BillingPricingType }))}>
              <SelectTrigger className="w-full rounded-xl border-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PER_TOKEN">PER_TOKEN</SelectItem>
                <SelectItem value="PER_IMAGE">PER_IMAGE</SelectItem>
                <SelectItem value="PER_REQUEST">PER_REQUEST</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.pricingType === "PER_TOKEN" ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500">Input rate</label>
                <Input value={form.inputRate} onChange={(e) => setForm((s) => ({ ...s, inputRate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500">Output rate</label>
                <Input value={form.outputRate} onChange={(e) => setForm((s) => ({ ...s, outputRate: e.target.value }))} />
              </div>
            </>
          ) : (
            <div className="space-y-2 lg:col-span-2">
              <label className="text-xs font-medium text-zinc-500">Rate</label>
              <Input value={form.rate} onChange={(e) => setForm((s) => ({ ...s, rate: e.target.value }))} />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            className="gap-2"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            <Plus className="h-4 w-4" />
            {editingBillingId ? "Update config" : "Create config"}
          </Button>
          {selectedModel ? (
            <span className="text-xs text-zinc-500">Selected model: {selectedModel.fullname}</span>
          ) : null}
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-950">Billing Configurations</h2>
        </div>
        {configList.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-zinc-400">No billing configurations found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-5 py-3">Model</th>
                  <th className="px-5 py-3">Pricing Type</th>
                  <th className="px-5 py-3">Rate</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {configList.map((config) => (
                  <tr key={config.billingId} className="border-t border-zinc-100 hover:bg-zinc-50">
                    <td className="px-5 py-3 font-medium text-zinc-950">{config.modelName}</td>
                    <td className="px-5 py-3 text-zinc-600">{config.pricingType}</td>
                    <td className="px-5 py-3 text-zinc-600">{formatConfigRate(config)}</td>
                    <td className="px-5 py-3 text-zinc-500">{new Date(config.updatedAt).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                          setEditingBillingId(config.billingId);
                          const parsed = parsePricingMetadata(config.pricingMetadata);
                          setForm({
                            modelId: String(config.modelId),
                            pricingType: config.pricingType,
                            inputRate: String(parsed?.inputRate ?? "0"),
                            outputRate: String(parsed?.outputRate ?? "0"),
                            rate: String(parsed?.rate ?? "0"),
                          });
                        }}>
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => {
                          if (window.confirm("Delete this billing config? Usage history will be preserved but this model can no longer be billed.")) {
                            deleteMutation.mutate(config.billingId);
                          }
                        }}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
