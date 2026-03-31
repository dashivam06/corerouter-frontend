"use client";

import { useMemo, useState } from "react";

export function PricingCalculator({
  pricingType,
  pricingMetadata,
}: {
  pricingType: string;
  pricingMetadata: any;
}) {
  const [inputTokens, setInputTokens] = useState<number>(1000);
  const [outputTokens, setOutputTokens] = useState<number>(500);
  const [pages, setPages] = useState<number>(10);
  const [requests, setRequests] = useState<number>(25);
  const [images, setImages] = useState<number>(2);

  const estimated = useMemo(() => {
    const r = pricingMetadata?.rates ?? pricingMetadata ?? {};
    if (pricingType === "PER_TOKEN") {
      const inRate = r.input_tokens ?? r.inputTokens ?? 0;
      const outRate = r.output_tokens ?? r.outputTokens ?? 0;
      return inputTokens * inRate + outputTokens * outRate;
    }
    if (pricingType === "PER_PAGE") return pages * (r.cost_per_page ?? r.PER_PAGE ?? 0);
    if (pricingType === "PER_REQUEST") return requests * (r.cost_per_request ?? r.PER_REQUEST ?? 0);
    if (pricingType === "PER_IMAGE") return images * (r.cost_per_image ?? r.PER_IMAGE ?? 0);
    return 0;
  }, [pricingType, pricingMetadata, inputTokens, outputTokens, pages, requests, images]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
      <p className="text-sm font-medium text-zinc-700">
        Sanity check calculator
      </p>
      <div className="mt-3 space-y-4">
        {pricingType === "PER_TOKEN" ? (
          <>
            <label className="block text-sm text-zinc-700">
              Input tokens
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                type="number"
                value={inputTokens}
                onChange={(e) => setInputTokens(Number(e.target.value))}
              />
            </label>
            <label className="block text-sm text-zinc-700">
              Output tokens
              <input
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                type="number"
                value={outputTokens}
                onChange={(e) => setOutputTokens(Number(e.target.value))}
              />
            </label>
          </>
        ) : null}

        {pricingType === "PER_PAGE" ? (
          <label className="block text-sm text-zinc-700">
            Pages
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              type="number"
              value={pages}
              onChange={(e) => setPages(Number(e.target.value))}
            />
          </label>
        ) : null}

        {pricingType === "PER_REQUEST" ? (
          <label className="block text-sm text-zinc-700">
            Requests
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              type="number"
              value={requests}
              onChange={(e) => setRequests(Number(e.target.value))}
            />
          </label>
        ) : null}

        {pricingType === "PER_IMAGE" ? (
          <label className="block text-sm text-zinc-700">
            Images
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              type="number"
              value={images}
              onChange={(e) => setImages(Number(e.target.value))}
            />
          </label>
        ) : null}

        <div className="pt-2">
          <div className="text-sm text-zinc-700">
            Estimated cost:
          </div>
          <div className="mt-1 text-lg font-semibold text-zinc-950">
            रू {estimated.toFixed(4)}
          </div>
        </div>
      </div>
    </div>
  );
}

