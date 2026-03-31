import Link from "next/link";
import { Cpu, Zap, Wallet, Check, ArrowRight, BarChart2, Code2, Shield, TrendingUp } from "lucide-react";
import { fetchModels, fetchBillingForModel } from "@/lib/api";
import type { MockBillingConfig, MockModel } from "@/lib/mock-data";
import { StatusBadge } from "@/components/shared/status-badge";

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

async function topModels() {
  const models = await fetchModels();
  return models.slice(0, 6);
}

export default async function LandingPage() {
  const pricing = await pricingRows();
  const models = await topModels();

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <img 
              src="/corerouter-logo.png" 
              alt="CoreRouter" 
              className="h-8 w-8 object-contain"
            />
            <span className="font-montserrat text-[15px] font-bold tracking-[0.08em] text-zinc-950">
              COREROUTER
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/models"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950"
            >
              Models
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-zinc-950/20"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden px-6 py-20 sm:py-32">
          <div className="absolute inset-0 -z-10">
            <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-gradient-to-br from-zinc-100 to-transparent opacity-60 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-t from-zinc-100 to-transparent opacity-60 blur-3xl" />
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full bg-zinc-100 px-4 py-2">
              <BarChart2 className="mr-2 h-4 w-4 text-zinc-700" />
              <span className="text-sm font-semibold text-zinc-900">
                Production-ready AI routing
              </span>
            </div>

            <h1 className="font-montserrat text-5xl font-bold leading-tight sm:text-6xl text-zinc-950">
              Route your AI<br />
              <span className="text-zinc-700">requests with precision</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600">
              Access multiple AI models through one unified API. Pay only for what you use with transparent token-based billing powered by eSewa.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-zinc-950/30"
              >
                Start building <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/models"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition-all hover:border-zinc-400"
              >
                Explore models
              </Link>
            </div>

            <p className="mt-8 text-xs font-medium uppercase tracking-widest text-zinc-500">
              Trusted by AI developers
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-32">
          <div className="mb-16 text-center">
            <h2 className="font-montserrat text-4xl font-bold text-zinc-950">
              Features
            </h2>
            <p className="mt-4 text-lg text-zinc-600">
              Everything you need to integrate AI into your application
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Cpu,
                title: "Multi-Model Support",
                desc: "LLMs, OCR, and custom models. Switch providers without changing your code."
              },
              {
                icon: Zap,
                title: "Token-Based Pricing",
                desc: "Pay for exactly what you use. No hidden fees, no monthly minimums."
              },
              {
                icon: Wallet,
                title: "eSewa Payments",
                desc: "Instant top-ups built for Nepal. Secure and convenient."
              },
              {
                icon: Code2,
                title: "Simple API",
                desc: "RESTful API with clear documentation and SDKs for popular languages."
              },
              {
                icon: TrendingUp,
                title: "Real-Time Analytics",
                desc: "Track usage, costs, and performance with granular insights."
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                desc: "API keys, rate limiting, and role-based access control."
              }
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="rounded-lg border border-zinc-200 bg-white p-8 transition-all hover:border-zinc-300 hover:shadow-md"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                    <Icon className="h-5 w-5 text-zinc-950" />
                  </div>
                  <h3 className="mb-2 font-semibold text-zinc-950">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-600">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Featured Models Section */}
        <section className="bg-zinc-50 px-6 py-20 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="mb-16 text-center">
              <h2 className="font-montserrat text-4xl font-bold text-zinc-950">
                Available Models
              </h2>
              <p className="mt-4 text-lg text-zinc-600">
                Choose from our growing catalog of AI models
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {models.map((model: MockModel) => (
                <div
                  key={model.model_id}
                  className="group rounded-lg border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-300 hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-950">
                        {model.fullname}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        by {model.provider}
                      </p>
                    </div>
                    <StatusBadge status={model.type} />
                  </div>

                  <p className="min-h-10 text-xs leading-relaxed text-zinc-600">
                    {model.description}
                  </p>

                  <div className="mt-6 border-t border-zinc-100 pt-4">
                    <Link
                      href={`/models/${model.username}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-950 transition-colors hover:text-zinc-600"
                    >
                      View details <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/models"
                className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-950 hover:text-zinc-600"
              >
                View all models <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-32">
          <div className="mb-16 text-center">
            <h2 className="font-montserrat text-4xl font-bold text-zinc-950">
              Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-zinc-600">
              See what our most popular models cost
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-6 py-4 text-left font-semibold text-zinc-950">
                    Model
                  </th>
                  <th className="px-6 py-4 text-left font-semibold text-zinc-950">
                    Type
                  </th>
                  <th className="px-6 py-4 text-right font-semibold text-zinc-950">
                    Pricing
                  </th>
                </tr>
              </thead>
              <tbody>
                {pricing.map((row, i) => (
                  <tr
                    key={row.name}
                    className={i !== pricing.length - 1 ? "border-b border-zinc-100" : ""}
                  >
                    <td className="px-6 py-4 font-medium text-zinc-900">
                      {row.name}
                    </td>
                    <td className="px-6 py-4 text-zinc-600">
                      <StatusBadge status={row.type as "LLM" | "OCR" | "OTHER"} />
                    </td>
                    <td className="px-6 py-4 text-right text-zinc-600 font-mono text-xs">
                      {row.line}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-50 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-zinc-600">
          <p>© 2026 CoreRouter · All rights reserved</p>
          <p>A product of Fleebug.com</p>
        </div>
      </footer>
    </div>
  );
}
