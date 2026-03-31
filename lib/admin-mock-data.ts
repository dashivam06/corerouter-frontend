export type AdminUserRole = "USER" | "ADMIN";
export type AdminUserStatus = "ACTIVE" | "INACTIVE" | "BANNED" | "SUSPENDED";

export type AdminKeyStatus = "ACTIVE" | "INACTIVE" | "REVOKED";

export type AdminModelStatus =
  | "NOTHING"
  | "ACTIVE"
  | "INACTIVE"
  | "DEPRECATED"
  | "ARCHIVED";
export type AdminModelType = "LLM" | "OCR" | "OTHER";

export type AdminTaskStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
export type AdminTxStatus = "PENDING" | "COMPLETED" | "FAILED";
export type AdminTxType = "WALLET" | "CARD" | "WALLET_TOPUP";

export type ServiceTokenRole = "WORKER" | "ANALYTICS" | "ADMIN";
export type WorkerInstanceStatus = "ONLINE" | "DOWN" | "STALE";

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

export type AdminUser = {
  user_id: number;
  balance: number;
  created_at: string;
  email: string;
  email_subscribed: boolean;
  full_name: string;
  last_login: string | null;
  profile_image: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
};

export type AdminApiKey = {
  api_key_id: number;
  created_at: string;
  daily_limit: number;
  daily_used: number;
  description: string;
  key: string;
  last_used_at: string | null;
  monthly_limit: number;
  monthly_used: number;
  status: AdminKeyStatus;
  user_id: number;
};

export type AdminModel = {
  model_id: number;
  created_at: string;
  updated_at: string;
  description: string;
  endpoint_url: string;
  fullname: string;
  metadata: Record<string, unknown>;
  provider: string;
  status: AdminModelStatus;
  type: AdminModelType;
  username: string;
};

export type AdminTask = {
  task_id: string;
  completed_at: string | null;
  created_at: string;
  processing_time_ms: number;
  request_payload: string;
  result_payload: string;
  status: AdminTaskStatus;
  total_cost: number;
  updated_at: string;
  api_key_id: number;
  model_id: number;
};

export type AdminUsageRecord = {
  usage_id: number;
  cost: number;
  quantity: number;
  rate_per_unit: number;
  recorded_at: string;
  usage_unit_type: UsageUnitType;
  api_key_id: number;
  billing_config_id: number | null;
  model_id: number;
  task_id: string;
};

export type AdminTransaction = {
  transaction_id: number;
  amount: number;
  completed_at: string | null;
  created_at: string;
  esewa_transaction_id: string;
  product_code: string | null;
  status: AdminTxStatus;
  type: AdminTxType;
  user_id: number;
};

export type AdminWorkerInstance = {
  instance_id: string;
  down_at: string | null;
  last_heartbeat: string;
  reason: string | null;
  service_name: string;
  started_at: string;
  status: WorkerInstanceStatus;
};

export type AdminServiceToken = {
  id: number;
  active: boolean;
  created_at: string;
  last_used_at: string | null;
  name: string;
  role: ServiceTokenRole;
  token_hash: string; // never show in UI
  token_id: string; // safe to show
};

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400_000).toISOString();
}

function hoursAgo(n: number) {
  return new Date(Date.now() - n * 3600_000).toISOString();
}

export const adminUsers: AdminUser[] = [
  {
    user_id: 1,
    balance: 2450,
    created_at: daysAgo(420),
    email: "admin@corerouter.ai",
    email_subscribed: true,
    full_name: "Alex Thapa",
    last_login: hoursAgo(3),
    profile_image: null,
    role: "ADMIN",
    status: "ACTIVE",
  },
  {
    user_id: 2,
    balance: 0,
    created_at: daysAgo(200),
    email: "samir@company.com",
    email_subscribed: false,
    full_name: "Samir Sharma",
    last_login: daysAgo(75),
    profile_image: null,
    role: "USER",
    status: "ACTIVE",
  },
  {
    user_id: 3,
    balance: 120,
    created_at: daysAgo(60),
    email: "ritika@studio.com",
    email_subscribed: true,
    full_name: "Ritika Karki",
    last_login: daysAgo(12),
    profile_image: null,
    role: "USER",
    status: "SUSPENDED",
  },
];

export const adminModels: AdminModel[] = [
  {
    model_id: 1,
    created_at: daysAgo(120),
    updated_at: daysAgo(1),
    description: "Flagship multimodal model with strong reasoning.",
    endpoint_url: "/v1/chat/completions",
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
  },
  {
    model_id: 2,
    created_at: daysAgo(90),
    updated_at: daysAgo(5),
    description: "Fast, capable assistant for everyday workloads.",
    endpoint_url: "/v1/messages",
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
  },
  {
    model_id: 3,
    created_at: daysAgo(70),
    updated_at: daysAgo(2),
    description: "High-accuracy document OCR pipeline.",
    endpoint_url: "/v1/ocr",
    fullname: "CoreRouter OCR Engine",
    metadata: { languages: "en, ne", dpi_max: 600 },
    provider: "Fleebug",
    status: "ACTIVE",
    type: "OCR",
    username: "corerouter-ocr-v2",
  },
  {
    model_id: 4,
    created_at: daysAgo(40),
    updated_at: daysAgo(18),
    description: "Draft embedding model for internal experiments.",
    endpoint_url: "/v1/embeddings",
    fullname: "CoreRouter Embed (Draft)",
    metadata: {},
    provider: "Fleebug",
    status: "NOTHING",
    type: "OTHER",
    username: "core-embed-draft",
  },
];

export const adminApiKeys: AdminApiKey[] = [
  {
    api_key_id: 1,
    created_at: daysAgo(40),
    daily_limit: 5000,
    daily_used: 1200,
    description: "Production server",
    key: "cr_demo_a1b2c3d4e5f67890abcdef1234567890",
    last_used_at: hoursAgo(2),
    monthly_limit: 100000,
    monthly_used: 42300,
    status: "ACTIVE",
    user_id: 1,
  },
  {
    api_key_id: 2,
    created_at: daysAgo(20),
    daily_limit: 2000,
    daily_used: 80,
    description: "Local development",
    key: "cr_demo_9z8y7x6w5v4u3t2s1r0qpo9988776655",
    last_used_at: null,
    monthly_limit: 50000,
    monthly_used: 890,
    status: "ACTIVE",
    user_id: 2,
  },
  {
    api_key_id: 3,
    created_at: daysAgo(12),
    daily_limit: 1000,
    daily_used: 0,
    description: "Staging",
    key: "cr_demo_aa11bb22cc33dd44ee55ff66778899aa",
    last_used_at: daysAgo(50),
    monthly_limit: 20000,
    monthly_used: 0,
    status: "INACTIVE",
    user_id: 3,
  },
];

export const adminTasks: AdminTask[] = [
  {
    task_id: "tsk_a9f2c1d4e5b67",
    model_id: 1,
    api_key_id: 1,
    status: "COMPLETED",
    total_cost: 0.0421,
    processing_time_ms: 1850,
    created_at: hoursAgo(2),
    completed_at: hoursAgo(2),
    updated_at: hoursAgo(1),
    request_payload: "{ \"messages\": [{ \"role\": \"user\", \"content\": \"Summarize...\" }] }",
    result_payload: "{ \"text\": \"A concise summary...\" }",
  },
  {
    task_id: "tsk_b8e3f2a1c0d98",
    model_id: 2,
    api_key_id: 1,
    status: "COMPLETED",
    total_cost: 0.0312,
    processing_time_ms: 2400,
    created_at: hoursAgo(7),
    completed_at: hoursAgo(7),
    updated_at: hoursAgo(6),
    request_payload: "{ \"prompt\": \"Translate to Nepali\" }",
    result_payload: "{ \"text\": \"...\" }",
  },
  {
    task_id: "tsk_c7d4e5f6a7b80",
    model_id: 3,
    api_key_id: 1,
    status: "FAILED",
    total_cost: 0,
    processing_time_ms: 420,
    created_at: hoursAgo(20),
    completed_at: hoursAgo(19),
    updated_at: hoursAgo(19),
    request_payload: "{ \"file\": \"image.png\" }",
    result_payload: "Invalid image format: unsupported DPI",
  },
  {
    task_id: "tsk_d6c5b4a39281",
    model_id: 1,
    api_key_id: 2,
    status: "PROCESSING",
    total_cost: 0,
    processing_time_ms: 0,
    created_at: hoursAgo(1),
    completed_at: null,
    updated_at: hoursAgo(0),
    request_payload: "{ \"messages\": [{ \"role\": \"user\", \"content\": \"Hello\" }] }",
    result_payload: "",
  },
];

export const adminUsageRecords: AdminUsageRecord[] = [
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
    recorded_at: hoursAgo(2),
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
    recorded_at: hoursAgo(2),
  },
];

export const adminTransactions: AdminTransaction[] = [
  {
    transaction_id: 1,
    user_id: 1,
    amount: 2000,
    type: "WALLET_TOPUP",
    status: "COMPLETED",
    esewa_transaction_id: "ESW-20250301-X9K2LL",
    product_code: "TOPUP",
    created_at: hoursAgo(140),
    completed_at: hoursAgo(140),
  },
  {
    transaction_id: 2,
    user_id: 1,
    amount: 500,
    type: "WALLET",
    status: "COMPLETED",
    esewa_transaction_id: "ESW-20250220-M1P9QQ",
    product_code: null,
    created_at: hoursAgo(320),
    completed_at: hoursAgo(320),
  },
  {
    transaction_id: 3,
    user_id: 2,
    amount: 1000,
    type: "WALLET_TOPUP",
    status: "PENDING",
    esewa_transaction_id: "ESW-20250330-PENDING1",
    product_code: "TOPUP",
    created_at: hoursAgo(1),
    completed_at: null,
  },
];

export const adminWorkerInstances: AdminWorkerInstance[] = [
  {
    instance_id: "inst-ocr-1",
    service_name: "ocr-worker",
    status: "ONLINE",
    last_heartbeat: hoursAgo(0.3),
    started_at: daysAgo(10),
    down_at: null,
    reason: null,
  },
  {
    instance_id: "inst-llm-1",
    service_name: "llm-worker",
    status: "STALE",
    last_heartbeat: hoursAgo(2.2),
    started_at: daysAgo(3),
    down_at: null,
    reason: null,
  },
  {
    instance_id: "inst-analytics-1",
    service_name: "analytics-worker",
    status: "DOWN",
    last_heartbeat: hoursAgo(10),
    started_at: daysAgo(20),
    down_at: hoursAgo(9),
    reason: "Upstream queue starvation",
  },
];

export const adminServiceTokens: AdminServiceToken[] = [
  {
    id: 1,
    active: true,
    created_at: daysAgo(8),
    last_used_at: hoursAgo(1),
    name: "Production LLM worker",
    role: "WORKER",
    token_hash: "HASH_NOT_SAFE",
    token_id: "tok_9f3a2c1d",
  },
  {
    id: 2,
    active: true,
    created_at: daysAgo(30),
    last_used_at: null,
    name: "Analytics pipeline",
    role: "ANALYTICS",
    token_hash: "HASH_NOT_SAFE",
    token_id: "tok_c1b2a3d4",
  },
  {
    id: 3,
    active: false,
    created_at: daysAgo(120),
    last_used_at: daysAgo(90),
    name: "Ops admin tooling",
    role: "ADMIN",
    token_hash: "HASH_NOT_SAFE",
    token_id: "tok_admin_001",
  },
];

export const adminRevenueTodayByHour: number[] = Array.from({ length: 24 }, (_, h) =>
  h <= new Date().getHours() ? 120 + Math.round(Math.random() * 420) : 0
);

export const adminHourlyTaskVolumeToday: number[] = Array.from({ length: 24 }, (_, h) =>
  h === new Date().getHours()
    ? 120 + Math.round(Math.random() * 200)
    : h < new Date().getHours()
      ? 40 + Math.round(Math.random() * 120)
      : 0
);

// For the 3-line chart: today, yesterday, 7 days ago
export const adminRevenueYesterdayByHour: number[] = adminRevenueTodayByHour.map(
  (v) => Math.max(30, Math.round(v * 0.55))
);
export const adminRevenueSevenDaysAgoByHour: number[] = adminRevenueTodayByHour.map(
  (v) => Math.max(20, Math.round(v * 0.28))
);

