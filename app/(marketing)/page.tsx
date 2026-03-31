import Link from "next/link";
import { Cpu, Wallet, Zap } from "lucide-react";
import { fetchModels, fetchBillingForModel } from "@/lib/api";
import type { MockBillingConfig } from "@/lib/mock-data";

async function pricingRows() {
  const models = await fetchModels();
  const rows: {
    name: string;
    type: string;
    line: string;
  }[] = [];
  for (const m of models.slice(0, 4)) {
    const b = (await fetchBillingForModel(m.model_id)) as MockBillingConfig | null;
    let line = "—";
    if (b?.pricing_type === "PER_TOKEN") {
      const in_ = b.pricing_metadata.rates?.INPUT_TOKENS_PER_1K ?? 0;
      const out = b.pricing_metadata.rates?.OUTPUT_TOKENS_PER_1K ?? 0;
      line = `रू ${in_}/1k input · रू ${out}/1k output`;
    } else if (b?.pricing_type === "PER_PAGE") {
      const p = b.pricing_metadata.rates?.PER_PAGE ?? 0;
      line = `रू ${p}/page`;
    } else if (b?.pricing_type === "PER_REQUEST") {
      const r = b.pricing_metadata.rates?.PER_REQUEST ?? 0;
      line = `रू ${r}/request`;
    }
    rows.push({ name: m.fullname, type: m.type, line });
  }
  return rows;
}

export default async function LandingPage() {
  const pricing = await pricingRows();
  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-xl font-semibold lowercase tracking-tight text-zinc-950"
          >
            fleebug
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-3 py-2 text-sm text-zinc-600 transition-colors hover:text-zinc-950"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-zinc-400">
            Powered by Fleebug.com
          </p>
          <h1 className="text-4xl font-bold leading-tight text-zinc-950 sm:text-[52px]">
            Route your AI requests.
            <br />
            Pay only for what you use.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-500">
            Access multiple AI models through one API. Token-based billing,
            eSewa payments, real-time usage tracking.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-4xl px-6 pb-6">
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <Cpu className="mb-3 size-6 text-zinc-800" />
              <h3 className="mb-1 text-[15px] font-semibold text-zinc-900">
                Multiple AI models
              </h3>
              <p className="text-sm leading-relaxed text-zinc-500">
                Access LLMs, OCR, and custom models through a single unified API
                endpoint.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <Zap className="mb-3 size-6 text-zinc-800" />
              <h3 className="mb-1 text-[15px] font-semibold text-zinc-900">
                Pay as you go
              </h3>
              <p className="text-sm leading-relaxed text-zinc-500">
                Token-based billing. Only pay for exactly what your requests
                consume.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <Wallet className="mb-3 size-6 text-zinc-800" />
              <h3 className="mb-1 text-[15px] font-semibold text-zinc-900">
                eSewa payments
              </h3>
              <p className="text-sm leading-relaxed text-zinc-500">
                Top up your balance instantly with eSewa. Built for Nepal.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-2xl px-6 pb-24">
          <h2 className="mb-6 text-center text-lg font-semibold text-zinc-900">
            Simple, transparent pricing
          </h2>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Pricing</th>
                </tr>
              </thead>
              <tbody>
                {pricing.map((row) => (
                  <tr
                    key={row.name}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{row.type}</td>
                    <td className="px-4 py-3 text-zinc-600">{row.line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="mt-12 border-t border-zinc-100 py-8 text-center text-sm text-zinc-400">
        <p>© 2026 Fleebug.com · All rights reserved</p>
        <p className="mt-2">
          <span className="cursor-pointer hover:text-zinc-600">Terms</span>
          <span className="mx-2">·</span>
          <span className="cursor-pointer hover:text-zinc-600">Privacy</span>
        </p>
      </footer>
    </div>
  );
}
