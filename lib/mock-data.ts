/** Temporary mock payloads — replace with real API integration */

export type UserRole = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "INACTIVE" | "BANNED" | "SUSPENDED" | "DELETED";
export type KeyStatus = "ACTIVE" | "INACTIVE" | "REVOKED";
export type ModelStatus = "NOTHING" | "ACTIVE" | "INACTIVE" | "DEPRECATED" | "ARCHIVED";
export type ModelType = "LLM" | "OCR" | "OTHER";
export type TaskStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
export type TxStatus = "PENDING" | "COMPLETED" | "FAILED";
export type TxType = "WALLET" | "CARD" | "WALLET_TOPUP";
export type UsageUnitType =
  | "INPUT_TOKENS"
  | "OUTPUT_TOKENS"
  | "PAGES"
  | "IMAGES"
  | "AUDIO_SECONDS"
  | "REQUESTS"
  | "CHARACTERS"
  | "EMBEDDING_TOKENS"
  | "CUSTOM_UNITS";

export interface MockUser {
  user_id: number;
  balance: number;
  created_at: string;
  email: string;
  email_subscribed: boolean;
  full_name: string;
  last_login: string | null;
  profile_image: string | null;
  role: UserRole;
  status: UserStatus;
}

export interface MockApiKey {
  api_key_id: number;
  created_at: string;
  daily_limit: number;
  daily_used: number;
  description: string;
  key: string;
  last_used_at: string | null;
  monthly_limit: number;
  monthly_used: number;
  status: KeyStatus;
  user_id: number;
}

export interface MockModel {
  model_id: number;
  description: string;
  fullname: string;
  metadata: Record<string, unknown>;
  provider: string;
  status: ModelStatus;
  type: ModelType;
  username: string;
  endpoint_url: string;
}

export interface MockBillingConfig {
  billing_id: number;
  pricing_metadata: {
    rates?: Record<string, number>;
    tiers?: { label: string; rate: number }[];
    currency?: string;
  };
  pricing_type: string;
  model_id: number;
}

export interface MockApiDoc {
  doc_id: number;
  content: string;
  created_at: string;
  title: string;
  updated_at: string | null;
  model_id: number;
  active: boolean;
}

export interface MockTask {
  task_id: string;
  completed_at: string | null;
  created_at: string;
  processing_time_ms: number;
  request_payload: string;
  result_payload: string;
  status: TaskStatus;
  total_cost: number;
  updated_at: string;
  api_key_id: number;
  model_id: number;
}

export interface MockUsageRecord {
  usage_id: number;
  cost: number;
  quantity: number;
  rate_per_unit: number;
  recorded_at: string;
  usage_unit_type: UsageUnitType;
  api_key_id: number;
  billing_config_id: number;
  model_id: number;
  task_id: string;
}

export interface MockTransaction {
  transaction_id: number;
  amount: number;
  completed_at: string | null;
  created_at: string;
  esewa_transaction_id: string | null;
  product_code: string | null;
  status: TxStatus;
  type: TxType;
  user_id: number;
}

export interface ActivityItem {
  id: string;
  description: string;
  created_at: string;
}

export interface BalancePoint {
  date: string;
  balance: number;
}

export const mockUser: MockUser = {
  user_id: 1,
  balance: 2450,
  created_at: "2025-01-10T08:00:00Z",
  email: "admin@corerouter.ai",
  email_subscribed: true,
  full_name: "Alex Thapa",
  last_login: new Date().toISOString(),
  profile_image: null,
  role: "ADMIN",
  status: "ACTIVE",
};

export const mockApiKeys: MockApiKey[] = [
  {
    api_key_id: 1,
    created_at: "2025-02-01T10:00:00Z",
    daily_limit: 5000,
    daily_used: 1200,
    description: "Production server",
    key: "cr_demo_a1b2c3d4e5f67890abcdef1234567890",
    last_used_at: new Date(Date.now() - 120_000).toISOString(),
    monthly_limit: 100_000,
    monthly_used: 42_300,
    status: "ACTIVE",
    user_id: 1,
  },
  {
    api_key_id: 2,
    created_at: "2025-02-15T14:30:00Z",
    daily_limit: 2000,
    daily_used: 80,
    description: "Local development",
    key: "cr_demo_9z8y7x6w5v4u3t2s1r0qpo9988776655",
    last_used_at: null,
    monthly_limit: 50_000,
    monthly_used: 890,
    status: "ACTIVE",
    user_id: 1,
  },
];

export const mockModels: MockModel[] = [
  {
    model_id: 1,
    description: "Flagship multimodal model with strong reasoning.",
    fullname: "GPT-4o November 2024",
    metadata: {
      context_length: 128000,
      supports_vision: true,
      supports_tools: true,
    },
    provider: "OpenAI",
    status: "ACTIVE",
    type: "LLM",
    username: "gpt-4o-2024-11",
    endpoint_url: "/v1/chat/completions",
  },
  {
    model_id: 2,
    description: "Fast, capable assistant for everyday workloads.",
    fullname: "Claude 3.5 Sonnet",
    metadata: {
      context_length: 200000,
      supports_vision: true,
      supports_tools: true,
    },
    provider: "Anthropic",
    status: "ACTIVE",
    type: "LLM",
    username: "claude-3-5-sonnet",
    endpoint_url: "/v1/messages",
  },
  {
    model_id: 3,
    description: "High-accuracy document OCR pipeline.",
    fullname: "CoreRouter OCR Engine",
    metadata: { languages: "en, ne", dpi_max: 600 },
    provider: "Fleebug",
    status: "ACTIVE",
    type: "OCR",
    username: "corerouter-ocr-v2",
    endpoint_url: "/v1/ocr",
  },
];

export const mockBilling: MockBillingConfig[] = [
  {
    billing_id: 1,
    pricing_type: "PER_TOKEN",
    model_id: 1,
    pricing_metadata: {
      currency: "NPR",
      rates: {
        INPUT_TOKENS_PER_1K: 0.0025,
        OUTPUT_TOKENS_PER_1K: 0.01,
      },
    },
  },
  {
    billing_id: 2,
    pricing_type: "PER_TOKEN",
    model_id: 2,
    pricing_metadata: {
      currency: "NPR",
      rates: {
        INPUT_TOKENS_PER_1K: 0.003,
        OUTPUT_TOKENS_PER_1K: 0.015,
      },
    },
  },
  {
    billing_id: 3,
    pricing_type: "PER_PAGE",
    model_id: 3,
    pricing_metadata: {
      currency: "NPR",
      rates: { PER_PAGE: 0.15 },
    },
  },
];

export const mockApiDocs: MockApiDoc[] = [
  {
    doc_id: 1,
    model_id: 1,
    title: "Quickstart",
    content:
      "<h2>Quickstart</h2><p>Send <strong>POST</strong> requests with JSON containing model slug and messages.</p><pre><code>POST /v1/chat/completions\nAuthorization: Bearer &lt;API_KEY&gt;</code></pre>",
    created_at: "2025-02-20T00:00:00Z",
    updated_at: "2025-03-01T00:00:00Z",
    active: true,
  },
  {
    doc_id: 2,
    model_id: 1,
    title: "Limits",
    content:
      "<h3>Usage limits</h3><p>Default rate limits apply per key. Contact support for enterprise throughput.</p><ul><li>Respect retry headers</li><li>Use backoff for 429 responses</li></ul>",
    created_at: "2025-02-24T00:00:00Z",
    updated_at: "2025-03-02T00:00:00Z",
    active: true,
  },
  {
    doc_id: 3,
    model_id: 2,
    title: "Claude API Basics",
    content:
      "<h2>Claude API Basics</h2><p>Use the messages endpoint for conversational workloads.</p><pre><code>POST /v1/messages\nAuthorization: Bearer &lt;API_KEY&gt;</code></pre><p>Pass model, max_tokens and messages in request body.</p>",
    created_at: "2025-03-03T00:00:00Z",
    updated_at: "2025-03-08T00:00:00Z",
    active: true,
  },
  {
    doc_id: 4,
    model_id: 2,
    title: "Best Practices",
    content:
      "<h3>Best Practices</h3><ul><li>Keep prompts specific and concise</li><li>Set max token limits per request</li><li>Handle retry logic for transient failures</li></ul>",
    created_at: "2025-03-05T00:00:00Z",
    updated_at: null,
    active: true,
  },
  {
    doc_id: 5,
    model_id: 3,
    title: "OCR Quickstart",
    content:
      "<h2>OCR Quickstart</h2><p>Upload image or PDF files to the OCR endpoint.</p><pre><code>POST /v1/ocr\nContent-Type: multipart/form-data</code></pre><p>Supported files: PNG, JPG, PDF.</p>",
    created_at: "2025-03-04T00:00:00Z",
    updated_at: "2025-03-10T00:00:00Z",
    active: true,
  },
  {
    doc_id: 6,
    model_id: 3,
    title: "OCR Response Format",
    content:
      "<h3>Response Format</h3><p>The API returns extracted text, page count and confidence score.</p><pre><code>{\n  \"text\": \"...\",\n  \"pages\": 2,\n  \"confidence\": 0.94\n}</code></pre>",
    created_at: "2025-03-06T00:00:00Z",
    updated_at: null,
    active: true,
  },
];

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400_000).toISOString();
}

export const mockTasks: MockTask[] = [
  {
    task_id: "tsk_a9f2c1d4e5b67",
    model_id: 1,
    api_key_id: 1,
    status: "COMPLETED",
    total_cost: 0.0421,
    processing_time_ms: 1850,
    created_at: daysAgo(0),
    completed_at: daysAgo(0),
    updated_at: daysAgo(0),
    request_payload: '{"messages":[{"role":"user","content":"Summarize this doc..."}]}',
    result_payload: '{"text":"Here is a concise summary..."}',
  },
  {
    task_id: "tsk_b8e3f2a1c0d98",
    model_id: 2,
    api_key_id: 1,
    status: "COMPLETED",
    total_cost: 0.0312,
    processing_time_ms: 2400,
    created_at: daysAgo(1),
    completed_at: daysAgo(1),
    updated_at: daysAgo(1),
    request_payload: '{"prompt":"Translate to Nepali"}',
    result_payload: '{"text":"..."}',
  },
  {
    task_id: "tsk_c7d4e5f6a7b80",
    model_id: 3,
    api_key_id: 1,
    status: "FAILED",
    total_cost: 0,
    processing_time_ms: 420,
    created_at: daysAgo(2),
    completed_at: daysAgo(2),
    updated_at: daysAgo(2),
    request_payload: '{"file":"image.png"}',
    result_payload: "Invalid image format: unsupported DPI",
  },
  {
    task_id: "tsk_d6c5b4a39281",
    model_id: 1,
    api_key_id: 2,
    status: "PROCESSING",
    total_cost: 0,
    processing_time_ms: 0,
    created_at: new Date().toISOString(),
    completed_at: null,
    updated_at: new Date().toISOString(),
    request_payload: "{\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}",
    result_payload: "",
  },
];

export const mockUsageRecords: MockUsageRecord[] = [
  {
    usage_id: 1,
    task_id: "tsk_a9f2c1d4e5b67",
    model_id: 1,
    api_key_id: 1,
    billing_config_id: 1,
    usage_unit_type: "INPUT_TOKENS",
    quantity: 1200,
    rate_per_unit: 0.0000025,
    cost: 0.003,
    recorded_at: daysAgo(0),
  },
  {
    usage_id: 2,
    task_id: "tsk_a9f2c1d4e5b67",
    model_id: 1,
    api_key_id: 1,
    billing_config_id: 1,
    usage_unit_type: "OUTPUT_TOKENS",
    quantity: 3900,
    rate_per_unit: 0.00001,
    cost: 0.039,
    recorded_at: daysAgo(0),
  },
];

export const mockTransactions: MockTransaction[] = [
  {
    transaction_id: 1,
    user_id: 1,
    amount: 2000,
    type: "WALLET_TOPUP",
    status: "COMPLETED",
    esewa_transaction_id: "ESW-20250301-X9K2LL",
    product_code: "TOPUP",
    created_at: daysAgo(5),
    completed_at: daysAgo(5),
  },
  {
    transaction_id: 2,
    user_id: 1,
    amount: 500,
    type: "WALLET",
    status: "COMPLETED",
    esewa_transaction_id: "ESW-20250220-M1P9QQ",
    product_code: null,
    created_at: daysAgo(12),
    completed_at: daysAgo(12),
  },
  {
    transaction_id: 3,
    user_id: 1,
    amount: 1000,
    type: "WALLET_TOPUP",
    status: "PENDING",
    esewa_transaction_id: null,
    product_code: "TOPUP",
    created_at: new Date(Date.now() - 3600_000).toISOString(),
    completed_at: null,
  },
];

export const mockActivity: ActivityItem[] = [
  { id: "1", description: "API key created · Production server", created_at: daysAgo(0) },
  { id: "2", description: "Wallet topped up via eSewa", created_at: daysAgo(1) },
  { id: "3", description: "API key revoked · Staging", created_at: daysAgo(3) },
];

export function buildBalanceHistory(base: number): BalancePoint[] {
  const out: BalancePoint[] = [];
  let b = base - 800;
  for (let i = 29; i >= 0; i--) {
    b += Math.round((Math.random() - 0.45) * 120);
    out.push({
      date: new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10),
      balance: Math.max(0, Math.round(b)),
    });
  }
  out[out.length - 1]!.balance = base;
  return out;
}

export const mockSpendSeries = {
  week: [120, 80, 200, 150, 90, 210, 175],
  month: Array.from({ length: 30 }, (_, i) => 60 + Math.round(Math.sin(i / 4) * 40) + i),
  "6mos": Array.from({ length: 26 }, (_, i) => 400 + i * 35 + Math.round(Math.random() * 80)),
  year: Array.from({ length: 12 }, (_, i) => 1200 + i * 220),
};

export const mockCreditsUsedThisMonth = 18420.55;
export const mockCreditsUsedLastMonth = 15200.0;

export const mockDashboardPie = [
  { name: "LLM", value: 72, type: "LLM" as const },
  { name: "OCR", value: 21, type: "OCR" as const },
  { name: "Other", value: 7, type: "OTHER" as const },
];
