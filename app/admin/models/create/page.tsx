"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, ChevronLeft, XCircle } from "lucide-react";
import type { AdminModelType, AdminModelStatus } from "@/lib/admin-mock-data";
import { adminFetchModels } from "@/lib/admin-api";
import { JsonTreeEditor } from "@/components/admin/json-tree-editor";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { PricingCalculator } from "@/components/admin/pricing-calculator";
import { JsonPreview } from "@/components/admin/json-preview";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Step = 1 | 2 | 3 | 4;

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function StepNode({
  idx,
  active,
  completed,
  label,
}: {
  idx: number;
  active: boolean;
  completed: boolean;
  label: string;
}) {
  return (
    <div className="flex min-w-[96px] flex-col items-center sm:min-w-0">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs sm:h-10 sm:w-10 sm:text-sm ${
          completed || active ? "bg-zinc-950 border-zinc-950 text-white" : "bg-white border-zinc-200 text-zinc-400"
        }`}
      >
        {completed ? <CheckCircle className="size-4 sm:size-5" /> : idx}
      </div>
      <div className={`mt-2 whitespace-nowrap text-[11px] sm:text-xs ${active || completed ? "text-zinc-900 font-medium" : "text-zinc-400"}`}>
        {label}
      </div>
    </div>
  );
}

export default function AdminCreateModelPage() {
  const { data: models } = useQuery({
    queryKey: ["admin-models"],
    queryFn: adminFetchModels,
  });

  const availableProviders = useMemo(() => {
    const providers = new Set((models ?? []).map(m => m.provider));
    return Array.from(providers).sort();
  }, [models]);

  const [step, setStep] = useState<Step>(1);

  const [fullName, setFullName] = useState("");
  const username = useMemo(() => slugify(fullName), [fullName]);

  const [provider, setProvider] = useState(availableProviders[0] ?? "");
  const [type, setType] = useState<AdminModelType>("LLM");
  const [status, setStatus] = useState<AdminModelStatus>("NOTHING");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [description, setDescription] = useState("");

  const [metadata, setMetadata] = useState<any>({});
  const [docsTitle, setDocsTitle] = useState("Overview");
  const [docsContent, setDocsContent] = useState("");

  const [pricingType, setPricingType] = useState<string>("PER_TOKEN");
  const pricingScaffold = useMemo(() => {
    switch (pricingType) {
      case "PER_TOKEN":
        return {
          rates: { input_tokens: 0.0000025, output_tokens: 0.0 },
          currency: "NPR",
          tiers: [{ up_to: 1000000, multiplier: 1.0 }],
        };
      case "PER_PAGE":
        return { cost_per_page: 0.15, currency: "NPR" };
      case "PER_REQUEST":
        return { cost_per_request: 0.05, currency: "NPR" };
      case "PER_IMAGE":
        return { cost_per_image: 0.1, currency: "NPR" };
      default:
        return {};
    }
  }, [pricingType]);
  const [pricingMetadata, setPricingMetadata] = useState<any>(pricingScaffold);

  const [publishStatus, setPublishStatus] = useState<AdminModelStatus>("ACTIVE");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <Link
          href="/admin/models"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-700"
        >
          <ChevronLeft className="size-4" />
          ← Models
        </Link>
      </div>

      <div className="mb-8 overflow-x-auto pb-1">
        <div className="flex min-w-[560px] items-center gap-3 sm:min-w-0 sm:w-full sm:gap-6">
          <StepNode
            idx={1}
            active={step === 1}
            completed={step > 1}
            label="Identity"
          />
          <div className={`h-px w-8 sm:w-auto sm:flex-1 ${step > 1 ? "bg-zinc-950" : "bg-zinc-200"}`} />
          <StepNode
            idx={2}
            active={step === 2}
            completed={step > 2}
            label="Documentation"
          />
          <div className={`h-px w-8 sm:w-auto sm:flex-1 ${step > 2 ? "bg-zinc-950" : "bg-zinc-200"}`} />
          <StepNode
            idx={3}
            active={step === 3}
            completed={step > 3}
            label="Billing"
          />
          <div className={`h-px w-8 sm:w-auto sm:flex-1 ${step > 3 ? "bg-zinc-950" : "bg-zinc-200"}`} />
          <StepNode idx={4} active={step === 4} completed={false} label="Review" />
        </div>
      </div>

      <div className="w-full">
        {step === 1 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-sm font-medium text-zinc-900">Full name</div>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-base outline-none focus:border-zinc-400"
                type="text"
              />
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-medium text-zinc-900">Username</div>
              <input
                value={username}
                readOnly
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-base outline-none"
              />
              <div className="mt-2 text-xs text-zinc-500">
                used as the model identifier in API calls
              </div>
            </label>

            <label className="block">
              <div className="mb-1 text-sm font-medium text-zinc-900">Provider</div>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.length > 0 ? (
                    availableProviders.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No providers available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <div className="mt-2 text-xs text-zinc-500">
                Select from existing providers or create a new one in the Models page
              </div>
            </label>

            <div>
              <div className="mb-1 text-sm font-medium text-zinc-900">Status</div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AdminModelStatus)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              >
                {["NOTHING", "ACTIVE", "INACTIVE", "DEPRECATED", "ARCHIVED"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-xs text-zinc-400">
                Set to Active only after billing and docs are configured.
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="mb-1 text-sm font-medium text-zinc-900">Type</div>
              <div className="flex gap-2">
                {(["LLM", "OCR", "OTHER"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                      type === t
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <label className="block sm:col-span-2">
              <div className="mb-1 text-sm font-medium text-zinc-900">
                Endpoint URL
              </div>
              <div className="flex gap-2">
                <input
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-base outline-none focus:border-zinc-400"
                />
                <button
                  type="button"
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Test
                </button>
              </div>
            </label>

            <label className="block sm:col-span-2">
              <div className="mb-1 text-sm font-medium text-zinc-900">
                Description
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-base outline-none focus:border-zinc-400"
              />
            </label>

            <div className="sm:col-span-2">
              <div className="cursor-pointer text-sm text-zinc-500">
                + Add model metadata
              </div>
              <div className="mt-3">
                <JsonTreeEditor
                  value={metadata}
                  onChange={setMetadata}
                  scaffold={
                    type === "LLM"
                      ? { context_length: 128000, supports_vision: true, supports_tools: true }
                      : type === "OCR"
                        ? { supported_formats: ["pdf", "png", "jpg"], max_pages: 100 }
                        : {}
                  }
                />
              </div>
            </div>
          </div>
        ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <RichTextEditor
                value={docsContent}
                onChange={setDocsContent}
                placeholder="Write documentation..."
              />
              <label className="block">
                <div className="mb-1 text-sm font-medium text-zinc-900">
                  Title
                </div>
                <input
                  value={docsTitle}
                  onChange={(e) => setDocsTitle(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-base outline-none focus:border-zinc-400"
                />
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div className="flex gap-2">
                {(["PER_TOKEN", "PER_PAGE", "PER_REQUEST", "PER_IMAGE", "CUSTOM"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPricingType(t)}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium ${
                      pricingType === t
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    {t.replace("_", " ")}
                  </button>
                ))}
              </div>
              <JsonTreeEditor
                value={pricingMetadata}
                onChange={setPricingMetadata}
                scaffold={pricingScaffold}
              />
              <PricingCalculator
                pricingType={pricingType}
                pricingMetadata={pricingMetadata}
              />
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <div className="text-sm font-medium text-zinc-900">Identity</div>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-zinc-400">Model name</div>
                      <div className="mt-1 text-sm text-zinc-700">{fullName || "Model name"}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-zinc-400">Username</div>
                      <div className="mt-1 text-xs text-zinc-500 font-mono">{username || "username"}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-zinc-400">Provider</div>
                      <div className="mt-1 text-sm text-zinc-700">{provider || "No provider selected"}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-zinc-400">Type</div>
                      <div className="mt-1 text-sm text-zinc-700">{type}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-zinc-400">Model status</div>
                      <div className="mt-1 text-sm text-zinc-700">{status}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-zinc-400">Endpoint</div>
                      <div className="mt-1 truncate text-sm text-zinc-700">{endpointUrl || "Not provided"}</div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs uppercase tracking-wide text-zinc-400">Description</div>
                      <div className="mt-1 line-clamp-2 text-sm text-zinc-700">{description || "No description"}</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <div className="text-sm font-medium text-zinc-900">Billing JSON</div>
                  <div className="mt-3">
                    <JsonPreview value={pricingMetadata} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-zinc-900">Documentation</div>
                  <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
                    {docsTitle || "Overview"}
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50/70 p-4">
                  {docsContent.trim() ? (
                    <div className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                      {docsContent}
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-400">No documentation content added yet.</div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-zinc-900">
                  Publish status
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["ACTIVE", "Publish as Active", "bg-green-50 border border-green-200"],
                      ["INACTIVE", "Save as Inactive", "bg-zinc-50 border border-zinc-200"],
                      ["NOTHING", "Save as Draft", "bg-zinc-50 border border-zinc-200"],
                    ] as const
                  ).map(([s, label, cls]) => (
                    <button
                      key={s}
                      type="button"
                      className={`rounded-xl px-4 py-3 text-left ${cls} ${
                        publishStatus === s ? "border-zinc-950" : ""
                      }`}
                      onClick={() => setPublishStatus(s as AdminModelStatus)}
                    >
                      <div className="text-sm font-medium text-zinc-900">{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="w-full rounded-xl bg-zinc-950 py-3 text-white hover:bg-zinc-900"
              >
                Create model
              </button>
          </div>
        ) : null}

        <div className="mt-8 flex gap-3 border-t border-zinc-100 pt-6">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => (s < 4 ? ((s + 1) as Step) : s))}
            className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={step === 4}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

function usernamePill(username: string) {
  return (
    <span className="inline-flex rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
      {username}
    </span>
  );
}

