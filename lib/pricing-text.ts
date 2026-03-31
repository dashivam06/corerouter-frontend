import type { MockBillingConfig } from "@/lib/mock-data";

export function pricingPreviewLine(b: MockBillingConfig | null): string {
  if (!b) return "—";
  const r = b.pricing_metadata.rates ?? {};
  switch (b.pricing_type) {
    case "PER_TOKEN":
      return `From रू ${r.INPUT_TOKENS_PER_1K ?? 0} / 1k tokens`;
    case "PER_PAGE":
      return `रू ${r.PER_PAGE ?? 0} / page`;
    case "PER_REQUEST":
      return `रू ${r.PER_REQUEST ?? 0} / request`;
    default:
      return b.pricing_type;
  }
}
