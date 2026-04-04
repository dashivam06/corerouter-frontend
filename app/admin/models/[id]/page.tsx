"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  adminCreateBillingConfig,
  adminCreateDocumentation,
  adminFetchBillingConfigByModel,
  adminFetchDocumentationByModel,
  adminFetchModelById,
  adminFetchModelControlDetails,
  adminFetchProviders,
  adminUpdateBillingConfig,
  adminUpdateDocumentation,
} from "@/lib/admin-api";
import { JsonTreeEditor } from "@/components/admin/json-tree-editor";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatRelative, parseUtcTimestamp } from "@/lib/formatters";
import { updateModel } from "@/lib/api";
import type {
  BillingConfigResponse,
  BillingPricingType,
  DocumentationResponse,
  ModelStatus,
} from "@/lib/api";
import type { AdminModelType } from "@/lib/admin-mock-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ModelFormState = {
  fullname: string;
  username: string;
  provider: string;
  endpointUrl: string;
  description: string;
  type: AdminModelType;
  status: ModelStatus;
};

function toModelStatus(status: string): ModelStatus {
  if (status === "ACTIVE" || status === "INACTIVE" || status === "DEPRECATED" || status === "ARCHIVED") {
    return status;
  }
  return "INACTIVE";
}

export default function AdminModelDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const modelId = Number(params?.id);

  const {
    data: controlDetails,
    isPending: controlDetailsPending,
    isError: controlDetailsError,
  } = useQuery({
    queryKey: ["admin-model-control-details", modelId],
    queryFn: () => adminFetchModelControlDetails(modelId),
    enabled: Number.isFinite(modelId),
  });
  const {
    data: fallbackModel,
    isPending: fallbackModelPending,
    isError: fallbackModelError,
  } = useQuery({
    queryKey: ["admin-model-by-id", modelId],
    queryFn: () => adminFetchModelById(modelId),
    enabled: Number.isFinite(modelId),
  });
  const {
    data: fallbackDocumentation,
  } = useQuery({
    queryKey: ["admin-model-documentation", modelId],
    queryFn: () => adminFetchDocumentationByModel(modelId),
    enabled: Number.isFinite(modelId),
  });
  const {
    data: fallbackBilling,
  } = useQuery<BillingConfigResponse | null>({
    queryKey: ["admin-model-billing-config", modelId],
    queryFn: async () => {
      try {
        return await adminFetchBillingConfigByModel(modelId);
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (message.includes("404") || message.includes("not found")) {
          return null;
        }
        throw error;
      }
    },
    enabled: Number.isFinite(modelId),
  });
  const { data: providers } = useQuery({
    queryKey: ["admin-providers"],
    queryFn: adminFetchProviders,
  });

  const model = controlDetails?.model ?? fallbackModel ?? null;
  const documentation = controlDetails?.documentation ?? fallbackDocumentation ?? [];
  const billingConfig = controlDetails?.billing ?? fallbackBilling ?? null;

  const [form, setForm] = useState<ModelFormState | null>(null);
  const [modelSaving, setModelSaving] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelMessage, setModelMessage] = useState<string | null>(null);

  const docList = documentation;
  const existingDoc = docList[0] ?? null;
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docError, setDocError] = useState<string | null>(null);
  const [docSubmitting, setDocSubmitting] = useState(false);
  const [docMessage, setDocMessage] = useState<string | null>(null);

  const [pricingType, setPricingType] = useState<BillingPricingType>("PER_TOKEN");
  const [pricingMetadata, setPricingMetadata] = useState<Record<string, unknown>>({});
  const [billingSaving, setBillingSaving] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!model) return;
    setForm({
      fullname: model.fullname,
      username: model.username,
      provider: model.provider,
      endpointUrl: model.endpoint_url,
      description: model.description,
      type: model.type,
      status: toModelStatus(model.status),
    });
  }, [model]);

  useEffect(() => {
    if (!billingConfig) return;
    setPricingType(billingConfig.pricingType);
    try {
      const parsed = billingConfig.pricingMetadata
        ? (JSON.parse(billingConfig.pricingMetadata) as Record<string, unknown>)
        : {};
      setPricingMetadata(parsed);
    } catch {
      setPricingMetadata({ raw: billingConfig.pricingMetadata });
    }
  }, [billingConfig]);

  useEffect(() => {
    if (!existingDoc) {
      setDocTitle("");
      setDocContent("");
      return;
    }
    setDocTitle(existingDoc.title ?? "");
    setDocContent(existingDoc.content ?? "");
  }, [existingDoc?.docId]);

  if (!Number.isFinite(modelId)) {
    return (
      <div className="py-20 text-center text-sm text-zinc-500">
        Invalid model ID. <Link href="/admin/models" className="text-zinc-900 underline">Back to models</Link>
      </div>
    );
  }

  if ((controlDetailsPending && fallbackModelPending) || (model && !form)) {
    return <div className="py-20 text-center text-sm text-zinc-500">Loading model...</div>;
  }

  if (controlDetailsError && fallbackModelError) {
    return (
      <div className="py-20 text-center text-sm text-zinc-500">
        Failed to load model. <Link href="/admin/models" className="text-zinc-900 underline">Back to models</Link>
      </div>
    );
  }

  if (!model || !form) {
    return (
      <div className="py-20 text-center text-sm text-zinc-500">
        Model not found. <Link href="/admin/models" className="text-zinc-900 underline">Back to models</Link>
      </div>
    );
  }

  const saveModel = async () => {
    if (!form.fullname.trim() || !form.username.trim() || !form.provider.trim() || !form.endpointUrl.trim()) {
      setModelError("Name, username, provider, and endpoint URL are required.");
      return;
    }

    setModelSaving(true);
    setModelError(null);
    setModelMessage(null);

    try {
      await updateModel(modelId, {
        fullname: form.fullname.trim(),
        username: form.username.trim(),
        provider: form.provider.trim(),
        endpointUrl: form.endpointUrl.trim(),
        description: form.description.trim(),
        status: form.status,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-model-control-details", modelId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-model-by-id", modelId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-models"] });
      setModelMessage("Model updated.");
    } catch (error) {
      setModelError(error instanceof Error ? error.message : "Unable to update model.");
    } finally {
      setModelSaving(false);
    }
  };

  const saveDocumentation = async () => {
    if (docTitle.trim().length < 5) {
      setDocError("Documentation title must be at least 5 characters.");
      return;
    }
    if (docContent.trim().length < 10) {
      setDocError("Documentation content must be at least 10 characters.");
      return;
    }

    setDocSubmitting(true);
    setDocError(null);
    setDocMessage(null);

    try {
      if (existingDoc) {
        await adminUpdateDocumentation(existingDoc.docId, {
          title: docTitle.trim(),
          content: docContent.trim(),
        });
      } else {
        await adminCreateDocumentation(modelId, {
          title: docTitle.trim(),
          content: docContent.trim(),
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["admin-model-control-details", modelId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-model-documentation", modelId] });
      setDocMessage("Documentation saved.");
    } catch (error) {
      setDocError(error instanceof Error ? error.message : "Unable to save documentation.");
    } finally {
      setDocSubmitting(false);
    }
  };

  const saveBilling = async () => {
    setBillingSaving(true);
    setBillingError(null);
    setBillingMessage(null);

    try {
      const payload = {
        pricingType,
        pricingMetadata: JSON.stringify(pricingMetadata ?? {}),
      };

      if (billingConfig) {
        await adminUpdateBillingConfig(billingConfig.billingId, payload);
      } else {
        await adminCreateBillingConfig({ modelId, ...payload });
      }

      await queryClient.invalidateQueries({ queryKey: ["admin-model-control-details", modelId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-model-billing-config", modelId] });
      setBillingMessage("Billing configuration saved.");
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Unable to save billing configuration.");
    } finally {
      setBillingSaving(false);
    }
  };

  const setFormField = <K extends keyof ModelFormState>(key: K, value: ModelFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-zinc-950">{model.fullname}</h1>
            <StatusBadge status={model.status} />
            <StatusBadge status={model.type} />
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Updated {formatRelative(parseUtcTimestamp(model.updated_at))}
          </div>
        </div>
        <Link href="/admin/models" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800">
          <ChevronLeft className="size-4" /> Back to models
        </Link>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 text-sm font-semibold text-zinc-900">Model identity</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <div className="mb-1 text-sm text-zinc-700">Full name</div>
            <input
              value={form.fullname}
              onChange={(event) => setFormField("fullname", event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm text-zinc-700">Username</div>
            <input
              value={form.username}
              onChange={(event) => setFormField("username", event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm font-mono outline-none focus:border-zinc-400"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm text-zinc-700">Provider</div>
            <Select value={form.provider} onValueChange={(value) => setFormField("provider", value ?? "") }>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {(providers ?? []).map((providerItem) => (
                  <SelectItem key={providerItem.providerId} value={providerItem.providerName}>
                    {providerItem.providerName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="block">
            <div className="mb-1 text-sm text-zinc-700">Endpoint URL</div>
            <input
              value={form.endpointUrl}
              onChange={(event) => setFormField("endpointUrl", event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-sm text-zinc-700">Type</div>
            <select
              value={form.type}
              onChange={(event) => setFormField("type", event.target.value as AdminModelType)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            >
              <option value="LLM">LLM</option>
              <option value="OCR">OCR</option>
              <option value="OTHER">OTHER</option>
            </select>
          </label>

          <label className="block">
            <div className="mb-1 text-sm text-zinc-700">Status</div>
            <select
              value={form.status}
              onChange={(event) => setFormField("status", event.target.value as ModelStatus)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="DEPRECATED">DEPRECATED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </label>

          <label className="block sm:col-span-2">
            <div className="mb-1 text-sm text-zinc-700">Description</div>
            <textarea
              value={form.description}
              onChange={(event) => setFormField("description", event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
          </label>
        </div>

        {modelError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{modelError}</div>
        ) : null}
        {modelMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{modelMessage}</div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={saveModel}
            disabled={modelSaving}
            className="rounded-xl bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {modelSaving ? "Saving..." : "Update model details"}
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 text-sm font-semibold text-zinc-900">Documentation</div>
        <div className="mb-4 text-xs text-zinc-500">
          {existingDoc ? "Single documentation record for this model." : "No documentation yet. Save to create it."}
        </div>
        <div>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">Title</label>
              <input
                value={docTitle}
                onChange={(event) => setDocTitle(event.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">Content</label>
              <RichTextEditor value={docContent} onChange={setDocContent} />
            </div>

            {docError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{docError}</div>
            ) : null}
            {docMessage ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{docMessage}</div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4">
              <button
                type="button"
                onClick={saveDocumentation}
                disabled={docSubmitting}
                className="rounded-xl bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {docSubmitting ? "Saving..." : existingDoc ? "Update documentation" : "Create documentation"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 text-sm font-semibold text-zinc-900">Billing configuration</div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="block">
            <div className="mb-1 text-sm text-zinc-700">Pricing type</div>
            <select
              value={pricingType}
              onChange={(event) => setPricingType(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            >
              <option value="PER_TOKEN">PER_TOKEN</option>
              <option value="PER_PAGE">PER_PAGE</option>
              <option value="PER_REQUEST">PER_REQUEST</option>
              <option value="PER_IMAGE">PER_IMAGE</option>
              <option value="CUSTOM">CUSTOM</option>
            </select>
          </label>
        </div>

        <div className="mt-4">
          <JsonTreeEditor
            value={pricingMetadata}
            onChange={(value) => setPricingMetadata((value as Record<string, unknown>) ?? {})}
          />
        </div>

        {billingError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{billingError}</div>
        ) : null}
        {billingMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{billingMessage}</div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={saveBilling}
            disabled={billingSaving}
            className="rounded-xl bg-zinc-950 px-4 py-2 text-sm text-white hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {billingSaving ? "Saving..." : billingConfig ? "Update billing config" : "Create billing config"}
          </button>
        </div>
      </section>
    </div>
  );
}
