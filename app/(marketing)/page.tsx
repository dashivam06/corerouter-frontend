import Link from "next/link";
import { Cpu, Zap, Wallet, Check, ArrowRight, BarChart2, Code2, Shield, TrendingUp } from "lucide-react";
import { type ModelResponse, fetchModels, fetchBillingForModel } from "@/lib/api";
import type { MockBillingConfig } from "@/lib/mock-data";
import { StatusBadge } from "@/components/shared/status-badge";

async function pricingRows() {
  const models = await fetchModels();
  const rows: {
    name: string;
    type: string;
    line: string;
  }[] = [];
  for (const m of models.slice(0, 4)) {
    const b = (await fetchBillingForModel(m.modelId)) as MockBillingConfig | null;
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
    <div className="min-h-screen bg-white text-zinc-950 font-montserrat">
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
          <div className="flex items-center gap-8">
            <Link
              href="/models"
              className="font-montserrat text-sm font-semibold text-zinc-600 transition-all hover:-translate-y-0.5 hover:text-zinc-950"
            >
              Models
            </Link>
            <Link
              href="/login"
              className="font-montserrat text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-950"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="font-montserrat rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-zinc-950/20"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden px-6 pb-20 pt-10 sm:pb-28 sm:pt-14">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              {/* Left Content */}
              <div>
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

                <p className="font-montserrat  mt-6 text-md leading-relaxed text-zinc-600">
                  Access multiple AI models through one unified API. Pay only for what you use with transparent token-based billing powered by eSewa.
                </p>

                <div className="mt-10 font-montserrat  flex flex-wrap gap-4">
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

                {/* <p className="mt-8 text-xs font-medium uppercase tracking-widest text-zinc-500">
                  Trusted by AI developers
                </p> */}
              </div>

              {/* Right Visual */}
              <div className="relative">
                <div className="mb-4">
                  <h2 className="font-montserrat text-2xl font-bold text-zinc-950">
                    Get started in seconds
                  </h2>
                  <p className="mt-2 text-xs text-zinc-600 font-montserrat">
                    Sample code. Use model docs for the exact curl command.
                  </p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-zinc-700">
                  <div className="flex items-center gap-3 bg-zinc-800 px-6 py-3">
                    <div className="flex gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                    </div>
                    <p className="ml-4 text-xs text-zinc-400">Terminal</p>
                  </div>
                  <div className="bg-black p-6">
                    <pre className="overflow-x-auto text-sm leading-relaxed font-mono">
                      <code>
                        <span className="text-zinc-500">$</span>
                        <span className="text-cyan-400"> curl</span>
                        <span className="text-blue-300"> https://api.corerouter.com/v1/complete</span>
                        <span className="text-zinc-500"> \</span>
                        <br />
                        <span className="text-zinc-500">  </span>
                        <span className="text-cyan-400">-H</span>
                        <span className="text-yellow-300"> "Authorization: Bearer </span>
                        <span className="text-green-400">pk_test_abc123</span>
                        <span className="text-yellow-300">..."</span>
                        <span className="text-zinc-500"> \</span>
                        <br />
                        <span className="text-zinc-500">  </span>
                        <span className="text-cyan-400">-H</span>
                        <span className="text-yellow-300"> "Content-Type: </span>
                        <span className="text-orange-300">application/json</span>
                        <span className="text-yellow-300">"</span>
                        <span className="text-zinc-500"> \</span>
                        <br />
                        <span className="text-zinc-500">  </span>
                        <span className="text-cyan-400">-d</span>
                        <span className="text-yellow-300"> '</span>
                        <span className="text-zinc-300">{`{`}</span>
                        <br />
                        <span className="text-zinc-500">    </span>
                        <span className="text-pink-400">"model"</span>
                        <span className="text-zinc-500">: </span>
                        <span className="text-green-400">"mistral-7b"</span>
                        <span className="text-zinc-300">,</span>
                        <br />
                        <span className="text-zinc-500">    </span>
                        <span className="text-pink-400">"messages"</span>
                        <span className="text-zinc-500">: [</span>
                        <span className="text-zinc-300">{`{`}</span>
                        <br />
                        <span className="text-zinc-500">      </span>
                        <span className="text-pink-400">"role"</span>
                        <span className="text-zinc-500">: </span>
                        <span className="text-green-400">"user"</span>
                        <span className="text-zinc-300">,</span>
                        <br />
                        <span className="text-zinc-500">      </span>
                        <span className="text-pink-400">"content"</span>
                        <span className="text-zinc-500">: </span>
                        <span className="text-green-400">"Explain quantum computing"</span>
                        <br />
                        <span className="text-zinc-500">    </span>
                        <span className="text-zinc-300">{`}`}</span>
                        <span className="text-zinc-500">]</span>
                        <br />
                        <span className="text-zinc-500">  </span>
                        <span className="text-zinc-300">{`}`}</span>
                        <span className="text-yellow-300">'</span>
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* API Keys Section */}
        <section className="px-6 py-20 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              {/* Left - API Key Examples */}
              <div className="space-y-3">
                <div className="rounded-lg border border-zinc-950 bg-zinc-50 p-5 shadow-sm">
                  <div className="grid gap-4 sm:grid-cols-[1fr_180px] sm:items-start">
                    <div>
                      <p className="mb-2 text-xs font-semibold text-zinc-700">pk_test_project_a123...</p>
                      <p className="text-sm font-semibold text-zinc-950">API Key A</p>
                      <p className="mt-1 text-xs text-zinc-700">Can be used with any model in CoreRouter</p>
                    </div>
                    <div className="text-[11px] text-zinc-600 sm:text-right">
                      <p>Daily: 50 / 120</p>
                      <p>Monthly: 360 / 1000</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-5">
                  <div className="grid gap-4 sm:grid-cols-[1fr_180px] sm:items-start">
                    <div>
                      <p className="mb-2 text-xs font-semibold text-zinc-600">pk_test_project_b456...</p>
                      <p className="text-sm font-semibold text-zinc-950">API Key B</p>
                      <p className="mt-1 text-xs text-zinc-600">Can be used with any model in CoreRouter</p>
                    </div>
                    <div className="text-[11px] text-zinc-600 sm:text-right">
                      <p>Daily: 28 / 80</p>
                      <p>Monthly: 190 / 700</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white p-5">
                  <div className="grid gap-4 sm:grid-cols-[1fr_180px] sm:items-start">
                    <div>
                      <p className="mb-2 text-xs font-semibold text-zinc-600">pk_test_project_c789...</p>
                      <p className="text-sm font-semibold text-zinc-950">API Key C</p>
                      <p className="mt-1 text-xs text-zinc-600">Can be used with any model in CoreRouter</p>
                    </div>
                    <div className="text-[11px] text-zinc-600 sm:text-right">
                      <p>Daily: 16 / 60</p>
                      <p>Monthly: 120 / 500</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right - Features */}
              <div>
                <h2 className="font-montserrat text-4xl font-bold text-zinc-950 mb-4">
                  Create Multiple API Keys
                </h2>
                <p className="text-lg leading-relaxed text-zinc-600 mb-8">
                  Organize your integrations with separate API keys for teams, projects, or environments. Any API key can be used with any model available in CoreRouter.
                </p>
                <ul className="space-y-3">
                  {[
                    "Any key works with any model in the system",
                    "Set daily request limits per key",
                    "Configure monthly usage quotas",
                    "Easy rotation and revocation"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-zinc-950 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>



        {/* Features Section */}
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-10 sm:pb-28 sm:pt-14">
          <div className="mb-16">
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
            <div className="mb-16">
              <h2 className="font-montserrat text-4xl font-bold text-zinc-950">
                Available Models
              </h2>
              <p className="mt-4 text-lg text-zinc-600">
                Choose from our growing catalog of AI models
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {models.map((model) => (
                <div
                  key={model.modelId}
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
          <div className="mb-16">
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
      <footer className="border-t border-zinc-200 bg-zinc-50 py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-6 text-center sm:grid-cols-3 sm:items-center sm:text-left">
          <div>
            <div className="inline-flex items-center gap-2">
              <img src="/corerouter-logo.png" alt="CoreRouter" className="h-6 w-6 object-contain" />
              <span className="text-sm font-semibold text-zinc-900">CoreRouter</span>
            </div>
            <p className="mt-3 text-xs text-zinc-600">
              © 2026 CoreRouter. All rights reserved.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-600">
            <a href="tel:+9779800000000" className="hover:text-zinc-900">
              +977 9828603447
            </a>
            <a href="mailto:info@corerouter.me" className="hover:text-zinc-900">
              thakurshivam202063@gmail.com
            </a>
          </div>

          <div className="flex justify-center sm:justify-end">
            <a
              href="https://fleebug.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-900"
            >
              <span className="font-monserract text-[11px]   tracking-[0.12em] text-zinc-700 font-bold">
                Powered by
              </span>
              <img src="/fleebug.svg" alt="Fleebug" className="h-10 w-auto" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
