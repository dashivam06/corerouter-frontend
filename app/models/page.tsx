"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchBillingForModel, fetchModels } from "@/lib/api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StatusBadge } from "@/components/shared/status-badge";
import { pricingPreviewLine } from "@/lib/pricing-text";
import type { MockModel } from "@/lib/mock-data";
import { useEffect } from "react";
import { Check, Copy, Sparkles } from "lucide-react";

function getCreatedAtLabel(model: MockModel): string {
  const maybeCreatedAt = (model as MockModel & { created_at?: string }).created_at;
  if (!maybeCreatedAt) return "Not available";
  const d = new Date(maybeCreatedAt);
  if (Number.isNaN(d.getTime())) return "Not available";
  return d.toLocaleDateString();
}

function ModelCard({ model, price }: { model: MockModel; price: string }) {
  const pathname = usePathname();
  const modelBasePath = pathname.startsWith("/dashboard/models")
    ? "/dashboard/models"
    : "/models";
  const [copied, setCopied] = useState(false);

  return (
    <article className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-colors hover:border-zinc-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold text-zinc-950">
              {model.fullname}
            </h3>
            <StatusBadge status={model.type} />
          </div>
          <p className="mt-2 text-xs text-zinc-500">Provider: {model.provider}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(model.username);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy username"}
          </button>
          <Link
            href={`${modelBasePath}/${model.username}`}
            className="inline-flex h-9 items-center rounded-lg bg-zinc-950 px-3 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            View details
          </Link>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-zinc-600">
        {model.description}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
        <p className="text-xs font-medium text-zinc-600">{price}</p>
        <p className="text-xs text-zinc-500">Created at: {getCreatedAtLabel(model)}</p>
      </div>
    </article>
  );
}

export default function ModelsCatalogPage() {
  const { data: models } = useQuery({
    queryKey: ["models"],
    queryFn: fetchModels,
  });
  const [type, setType] = useState<"ALL" | "LLM" | "OCR" | "OTHER">("ALL");
  const [q, setQ] = useState("");
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [priceSortValues, setPriceSortValues] = useState<Record<number, number | null>>({});
  const [sortBy, setSortBy] = useState<"NAME_ASC" | "NAME_DESC" | "PRICE_ASC" | "PRICE_DESC">("NAME_ASC");

  const filtered = useMemo(() => {
    let list = models ?? [];
    if (type !== "ALL") list = list.filter((m) => m.type === type);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (m) =>
          m.fullname.toLowerCase().includes(s) ||
          m.username.toLowerCase().includes(s)
      );
    }

    list = [...list].sort((a, b) => {
      if (sortBy === "NAME_ASC") return a.fullname.localeCompare(b.fullname);
      if (sortBy === "NAME_DESC") return b.fullname.localeCompare(a.fullname);

      const av = priceSortValues[a.model_id];
      const bv = priceSortValues[b.model_id];

      if (av == null && bv == null) return a.fullname.localeCompare(b.fullname);
      if (av == null) return 1;
      if (bv == null) return -1;

      return sortBy === "PRICE_ASC" ? av - bv : bv - av;
    });

    return list;
  }, [models, type, q, sortBy, priceSortValues]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!models) return;
      const entries: Record<number, string> = {};
      const sortValues: Record<number, number | null> = {};
      for (const m of models) {
        const b = await fetchBillingForModel(m.model_id);
        entries[m.model_id] = pricingPreviewLine(b);
        const rates = Object.values(b?.pricing_metadata?.rates ?? {}).filter(
          (r): r is number => typeof r === "number" && Number.isFinite(r)
        );
        sortValues[m.model_id] = rates.length ? Math.min(...rates) : null;
      }
      if (!cancelled) {
        setPrices(entries);
        setPriceSortValues(sortValues);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [models]);

  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-zinc-100/70 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
              Available models
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Browse production-ready models and compare capabilities, providers,
              and pricing in one place.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-600">
            <Sparkles className="size-3.5" />
            CoreRouter model catalog
          </div>
        </div>
      </section>

      <div className="mt-6 flex gap-6">
        {/* Left Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <div className="sticky top-20 space-y-6">
            {/* Search */}
            <div>
              <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Search
              </label>
              <input
                placeholder="Search models..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-zinc-400"
              />
            </div>

            {/* Model Type Filter */}
            <div>
              <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Model Type
              </label>
              <div className="space-y-2">
                {(
                  [
                    ["ALL", "All Models"],
                    ["LLM", "LLM"],
                    ["OCR", "OCR"],
                    ["OTHER", "Other"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setType(k)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-all ${
                      type === k
                        ? "bg-zinc-950 text-white font-medium"
                        : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as
                      | "NAME_ASC"
                      | "NAME_DESC"
                      | "PRICE_ASC"
                      | "PRICE_DESC"
                  )
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-700 outline-none transition-colors focus:border-zinc-400"
                aria-label="Sort models"
              >
                <option value="NAME_ASC">Name: A to Z</option>
                <option value="NAME_DESC">Name: Z to A</option>
                <option value="PRICE_ASC">Pricing: Low to High</option>
                <option value="PRICE_DESC">Pricing: High to Low</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="rounded-lg bg-zinc-100 px-3 py-2">
              <p className="text-xs text-zinc-600">
                <span className="font-semibold text-zinc-900">{filtered.length}</span> model{filtered.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="space-y-4">
            {filtered.map((m) => (
              <ModelCard
                key={m.model_id}
                model={m}
                price={prices[m.model_id] ?? "…"}
              />
            ))}
          </div>

          {!filtered.length ? (
            <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
              No models match your filters.
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
