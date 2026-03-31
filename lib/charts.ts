/** Flat fills / strokes only — no gradients */

export const chartTheme = {
  grid: { stroke: "#f4f4f5", strokeDasharray: "3 3" as const },
  axis: { tick: { fontSize: 12, fill: "#71717a" } },
  tooltip: {
    contentStyle: {
      background: "#ffffff",
      border: "1px solid #e4e4e7",
      borderRadius: "12px",
      fontSize: "12px",
      boxShadow: "none",
    },
  },
} as const;

export const unitTypeColors: Record<string, string> = {
  INPUT_TOKENS: "#09090b",
  OUTPUT_TOKENS: "#52525b",
  PAGES: "#0d9488",
  IMAGES: "#7c3aed",
  AUDIO_SECONDS: "#2563eb",
  REQUESTS: "#d97706",
  CHARACTERS: "#db2777",
  EMBEDDING_TOKENS: "#16a34a",
  CUSTOM_UNITS: "#ea580c",
};

export const badgeStyles: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700 border border-green-200",
  INACTIVE: "bg-zinc-100 text-zinc-600 border border-zinc-200",
  REVOKED: "bg-red-50 text-red-700 border border-red-200",
  BANNED: "bg-red-50 text-red-700 border border-red-200",
  SUSPENDED: "bg-amber-50 text-amber-700 border border-amber-200",
  QUEUED: "bg-blue-50 text-blue-600 border border-blue-200",
  PROCESSING: "bg-amber-50 text-amber-700 border border-amber-200",
  COMPLETED: "bg-green-50 text-green-700 border border-green-200",
  FAILED: "bg-red-50 text-red-700 border border-red-200",
  // Models (admin)
  NOTHING: "bg-blue-50 text-blue-600 border border-blue-200", // Draft
  DEPRECATED: "bg-orange-50 text-orange-700 border border-orange-200",
  ARCHIVED: "bg-zinc-100 text-zinc-500 border border-zinc-200",
  WALLET: "bg-blue-50 text-blue-700 border border-blue-200",
  CARD: "bg-violet-50 text-violet-700 border border-violet-200",
  WALLET_TOPUP: "bg-teal-50 text-teal-700 border border-teal-200",
  LLM: "bg-violet-50 text-violet-700 border border-violet-200",
  OCR: "bg-teal-50 text-teal-700 border border-teal-200",
  OTHER: "bg-zinc-100 text-zinc-600 border border-zinc-200",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  // Service tokens (admin)
  WORKER: "bg-zinc-100 text-zinc-700 border border-zinc-200",
  ANALYTICS: "bg-blue-50 text-blue-700 border border-blue-200",
  ADMIN: "bg-amber-50 text-amber-700 border border-amber-200",
  // Worker instances (admin)
  ONLINE: "bg-green-50 text-green-700 border border-green-200",
  DOWN: "bg-red-50 text-red-700 border border-red-200",
  STALE: "bg-amber-50 text-amber-700 border border-amber-200",
};
