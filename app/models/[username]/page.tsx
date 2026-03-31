"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchBillingForModel, fetchModelDocs, fetchModels } from "@/lib/api";
import { StatusBadge } from "@/components/shared/status-badge";
import { Check, Copy } from "lucide-react";

export default function ModelDetailPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const { data: models } = useQuery({
    queryKey: ["models"],
    queryFn: fetchModels,
  });
  const model = models?.find((m) => m.username === username);
  const [copied, setCopied] = useState(false);
  const { data: billing } = useQuery({
    queryKey: ["model-billing", model?.model_id],
    queryFn: () => fetchBillingForModel(model!.model_id),
    enabled: !!model,
  });
  const { data: docs } = useQuery({
    queryKey: ["model-docs", model?.model_id],
    queryFn: () => fetchModelDocs(model!.model_id),
    enabled: !!model,
  });

  if (!model) {
    return (
      <div className="py-20 text-center text-sm text-zinc-500">
        Model not found.{" "}
        <Link href="/models" className="text-zinc-950 underline">
          Back to catalog
        </Link>
      </div>
    );
  }

  const renderDocDate = (createdAt: string, updatedAt?: string | null) => {
    const created = new Date(createdAt).toLocaleDateString();
    const updated = updatedAt ? new Date(updatedAt).toLocaleDateString() : null;
    if (!updated) return `Created ${created}`;
    return `Created ${created} · Updated ${updated}`;
  };

  const formatPricingKey = (k: string) =>
    k
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .toLowerCase();

  const pricingSource = billing?.pricing_metadata
    ? typeof billing.pricing_metadata.rates === "object" &&
      billing.pricing_metadata.rates
      ? billing.pricing_metadata.rates
      : billing.pricing_metadata
    : null;

  const pricingEntries = pricingSource
    ? Object.entries(pricingSource).filter(([, v]) => v != null)
    : [];

  return (
    <div className="w-full">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-start gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
                {model.fullname}
              </h1>
              <StatusBadge status={model.type} />
              <span className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-600">
                {model.provider}
              </span>
            </div>
            <p className="mt-2 font-mono text-sm text-zinc-500">{model.username}</p>
          </div>

          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(model.username);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy model username"}
          </button>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Pricing metadata</h2>
        {!pricingEntries.length ? (
          <p className="mt-2 text-sm text-zinc-500">No pricing metadata available.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pricingEntries.map(([k, v]) => (
              <div
                key={k}
                className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2"
              >
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                  {formatPricingKey(k)}
                </p>
                <p className="mt-0.5 text-sm font-medium text-zinc-900">
                  {typeof v === "number" ? v.toLocaleString() : String(v)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-950">API Documentation</h2>
        <div className="mt-4">
          {!docs?.length ? (
            <p className="py-12 text-center text-sm text-zinc-400">
              No documentation available yet
            </p>
          ) : (
            <div className="space-y-4">
              {docs.map((d) => (
                <article
                  key={d.doc_id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-3">
                    <h3 className="text-[15px] font-semibold text-zinc-950">
                      {d.title}
                    </h3>
                    <p className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-500">
                      {renderDocDate(d.created_at, d.updated_at)}
                    </p>
                  </div>
                  <article
                    className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50/40 p-4 text-sm leading-relaxed text-zinc-700 [&_a]:text-zinc-900 [&_a]:underline [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:my-3 [&_ol]:list-decimal [&_p]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-zinc-200 [&_pre]:bg-white [&_pre]:p-3 [&_ul]:my-3 [&_ul]:list-disc"
                    dangerouslySetInnerHTML={{ __html: d.content }}
                  />
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
