import {
  createBillingConfig as apiCreateBillingConfig,
  createDocumentation as apiCreateDocumentation,
  createProvider as apiCreateProvider,
  deleteBillingConfig as apiDeleteBillingConfig,
  deleteDocumentation as apiDeleteDocumentation,
  deleteProvider as apiDeleteProvider,
  deleteApiKey as apiDeleteApiKey,
  fetchProviders as apiFetchProviders,
  getAdminBillingInsights as apiGetAdminBillingInsights,
  getAdminApiKeyAnalytics as apiGetAdminApiKeyAnalytics,
  getAdminApiKeyInsights as apiGetAdminApiKeyInsights,
  getAdminApiKeyList as apiGetAdminApiKeyList,
  getAdminModelControlDetails as apiGetAdminModelControlDetails,
  getAdminUsageByTask as apiGetAdminUsageByTask,
  getAdminModelDetails as apiGetAdminModelDetails,
  getAllModels,
  getBillingConfigByModel as apiGetBillingConfigByModel,
  getBillingConfigById as apiGetBillingConfigById,
  getAdminUsageSummaryByApiKey as apiGetAdminUsageSummaryByApiKey,
  getAdminUsageSummaryByModel as apiGetAdminUsageSummaryByModel,
  getAdminUserAnalytics as apiGetAdminUserAnalytics,
  getAdminUserInsights as apiGetAdminUserInsights,
  getAdminUserList as apiGetAdminUserList,
  deactivateApiKey as apiDeactivateApiKey,
  enableApiKey as apiEnableApiKey,
  updateAdminApiKeyStatus as apiUpdateAdminApiKeyStatus,
  updateAdminUserStatus as apiUpdateAdminUserStatus,
  listBillingConfigs as apiListBillingConfigs,
  listDocumentationByModel as apiListDocumentationByModel,
  recordUsage as apiRecordUsage,
  updateBillingConfig as apiUpdateBillingConfig,
  updateDocumentation as apiUpdateDocumentation,
  updateProvider as apiUpdateProvider,
  changeProviderStatus as apiChangeProviderStatus,
  type BillingConfigCreateBody,
  type BillingConfigResponse,
  type BillingConfigUpdateBody,
  type BillingInsightsResponse,
  type ApiKeyRecord,
  type DailyUserAnalyticsResponse,
  type ModelControlDetailsResponse,
  type DocumentationCreateBody,
  type DocumentationResponse,
  type DocumentationUpdateBody,
  type ModelResponse,
  type AdminUserInsightsResponse,
  type AdminApiKeyAnalyticsResponse,
  type AdminApiKeyInsightsResponse,
  type AdminApiKeyListItem,
  type AdminApiKeyStatus,
  type PaginatedUserListResponse,
  type ProviderResponse,
  type RecordUsageBody,
  type UserRole,
  type UserStatus,
  type UsageRecordResponse,
  type UsageSummaryResponse,
} from "@/lib/api";

import {
  adminHourlyTaskVolumeToday,
  adminRevenueSevenDaysAgoByHour,
  adminRevenueTodayByHour,
  adminRevenueYesterdayByHour,
  adminServiceTokens,
  adminTasks,
  adminTransactions,
  adminUsageRecords,
  adminUsers,
  adminWorkerInstances,
  type AdminApiKey,
  type AdminModel,
  type AdminServiceToken,
  type AdminTask,
  type AdminTransaction,
  type AdminUsageRecord,
  type AdminUser,
  type AdminWorkerInstance,
} from "@/lib/admin-mock-data";

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

async function mock<T>(value: T): Promise<T> {
  await delay();
  return structuredClone(value);
}

function toAdminModel(model: ModelResponse): AdminModel {
  return {
    model_id: model.modelId,
    created_at: model.createdAt,
    updated_at: model.updatedAt ?? model.createdAt,
    description: model.description,
    endpoint_url: model.endpointUrl,
    fullname: model.fullname,
    metadata: {},
    provider: model.provider,
    status: model.status === "ACTIVE" ? "ACTIVE" : model.status === "INACTIVE" ? "INACTIVE" : model.status === "DEPRECATED" ? "DEPRECATED" : "ARCHIVED",
    type: model.type === "LLM" || model.type === "OCR" ? model.type : "OTHER",
    username: model.username,
  };
}

export async function adminFetchUsers(): Promise<AdminUser[]> {
  return mock(adminUsers);
}

export type AdminUsersPageItem = {
  userId: number;
  fullName: string;
  email: string;
  profileImage: string | null;
  emailSubscribed: boolean;
  status: UserStatus;
  role: UserRole;
};

export type AdminUsersListResult = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  users: AdminUsersPageItem[];
  isLastPage: boolean;
};

export async function adminFetchUserInsights(): Promise<AdminUserInsightsResponse> {
  return apiGetAdminUserInsights();
}

export async function adminFetchUserAnalytics(from: string, to: string): Promise<{
  dailyAnalytics: DailyUserAnalyticsResponse[];
  totalCreated: number;
  totalDeleted: number;
  totalRevoked: number;
}> {
  return apiGetAdminUserAnalytics(from, to);
}

export async function adminFetchUsersPage(params: {
  page: number;
  size: number;
  role?: UserRole;
  status?: UserStatus;
}): Promise<AdminUsersListResult> {
  const result: PaginatedUserListResponse = await apiGetAdminUserList(params);
  return {
    page: result.page,
    size: result.size,
    totalElements: result.totalElements,
    totalPages: result.totalPages,
    isLastPage: result.isLastPage,
    users: result.users.map((user) => ({
      userId: user.userId,
      fullName: user.fullName,
      email: user.email,
      profileImage: user.profileImage,
      emailSubscribed: user.emailSubscribed,
      status: user.status,
      role: user.role ?? params.role ?? "USER",
    })),
  };
}

export async function adminUpdateUserStatus(userId: number, status: UserStatus): Promise<AdminUsersPageItem> {
  const user = await apiUpdateAdminUserStatus(userId, status);
  return {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    profileImage: user.profileImage,
    emailSubscribed: user.emailSubscribed,
    status: user.status,
    role: user.role ?? "USER",
  };
}

export type AdminApiKeyListItemView = AdminApiKeyListItem & {
  userName: string | null;
};

export type AdminApiKeyInsightsView = {
  totalKeys: number;
  activeKeys: number;
  inactiveKeys: number;
  revokedKeys: number;
  keysCreatedThisMonth: number;
};

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Number(value ?? 0) || 0;
}

function toAnalyticsDate(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    return "";
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return value;
}

function normalizeApiKeyAnalyticsResponse(raw: unknown): AdminApiKeyAnalyticsResponse {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const dailySource = Array.isArray(source.dailyAnalytics)
    ? source.dailyAnalytics
    : Array.isArray(source.analytics)
      ? source.analytics
      : Array.isArray(source.data)
        ? source.data
        : Array.isArray(source.daily_analytics)
          ? source.daily_analytics
          : Array.isArray(source.series)
            ? source.series
            : Array.isArray(source.items)
              ? source.items
              : Array.isArray(source.records)
                ? source.records
                : Array.isArray(source.days)
                  ? source.days
                  : [];

  return {
    dailyAnalytics: dailySource.map((entry) => {
      const item = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
      return {
        date: toAnalyticsDate(
          item.date ??
            item.day ??
            item.month ??
            item.createdAt ??
            item.created_at ??
            item.bucketDate ??
            item.bucket_date ??
            item.statDate ??
            item.stat_date
        ),
        created: toNumber(
          item.created ??
            item.createdCount ??
            item.totalCreated ??
            item.apiKeysCreated ??
            item.created_count ??
            item.total_created ??
            item.api_keys_created
        ),
        revoked: toNumber(
          item.revoked ??
            item.revokedCount ??
            item.totalRevoked ??
            item.apiKeysRevoked ??
            item.revoked_count ??
            item.total_revoked ??
            item.api_keys_revoked
        ),
        active: toNumber(
          item.active ??
            item.activeCount ??
            item.totalActive ??
            item.apiKeysActive ??
            item.active_count ??
            item.total_active ??
            item.api_keys_active
        ),
        inactive: toNumber(
          item.inactive ??
            item.inactiveCount ??
            item.totalInactive ??
            item.apiKeysInactive ??
            item.inactive_count ??
            item.total_inactive ??
            item.api_keys_inactive
        ),
        total: toNumber(item.total ?? item.totalKeys ?? item.count ?? item.total_keys),
      };
    }),
    totalCreated: toNumber(source.totalCreated ?? source.created ?? source.createdCount ?? source.total_created ?? source.created_count),
    totalRevoked: toNumber(source.totalRevoked ?? source.revoked ?? source.revokedCount ?? source.total_revoked ?? source.revoked_count),
    totalActive: toNumber(source.totalActive ?? source.active ?? source.activeCount ?? source.total_active ?? source.active_count),
    totalInactive: toNumber(source.totalInactive ?? source.inactive ?? source.inactiveCount ?? source.total_inactive ?? source.inactive_count),
  };
}

export async function adminFetchApiKeyInsights(): Promise<AdminApiKeyInsightsView> {
  const insights = await apiGetAdminApiKeyInsights();
  return {
    totalKeys: toNumber(insights.totalKeys),
    activeKeys: toNumber(insights.active),
    inactiveKeys: toNumber(insights.inactive),
    revokedKeys: toNumber(insights.revoked),
    keysCreatedThisMonth: 0,
  };
}

export async function adminFetchApiKeyAnalytics(from: string, to: string): Promise<AdminApiKeyAnalyticsResponse> {
  const analytics = await apiGetAdminApiKeyAnalytics(from, to);
  return normalizeApiKeyAnalyticsResponse(analytics);
}

export async function adminFetchApiKeys(): Promise<AdminApiKey[]> {
  const result = await apiGetAdminApiKeyList({ page: 0, size: 1000 });
  return result.apiKeys.map((key) => ({
    api_key_id: key.apiKeyId,
    created_at: key.createdAt,
    daily_limit: key.dailyLimit,
    daily_used: key.dailyUsed,
    description: key.description,
    key: key.key,
    last_used_at: key.lastUsedAt,
    monthly_limit: key.monthlyLimit,
    monthly_used: key.monthlyUsed,
    status: key.status,
    user_id: key.userId ?? 0,
  }));
}

export async function adminFetchApiKeysPage(params: {
  page: number;
  size: number;
  status?: AdminApiKeyStatus;
}): Promise<{ page: number; size: number; totalElements: number; totalPages: number; isLastPage: boolean; apiKeys: AdminApiKeyListItemView[] }> {
  const result = await apiGetAdminApiKeyList(params);
  return {
    ...result,
    apiKeys: result.apiKeys.map((key) => ({
      ...key,
      userName: key.userName ?? key.userFullName ?? key.userEmail ?? null,
      userEmail: key.userEmail ?? null,
    })),
  };
}

export async function adminUpdateApiKeyStatus(apiKeyId: number, status: AdminApiKeyStatus): Promise<ApiKeyRecord> {
  return apiUpdateAdminApiKeyStatus(apiKeyId, status);
}

export async function adminFetchModels(): Promise<AdminModel[]> {
  const models = await getAllModels();
  return models.map(toAdminModel);
}

export async function adminFetchModelById(modelId: number): Promise<AdminModel> {
  const model = await apiGetAdminModelDetails(modelId);
  return toAdminModel(model);
}

export async function adminFetchModelControlDetails(modelId: number): Promise<{
  model: AdminModel;
  billing: ModelControlDetailsResponse["billing"];
  documentation: DocumentationResponse[];
  tasks: ModelControlDetailsResponse["tasks"];
}> {
  const details = await apiGetAdminModelControlDetails(modelId);
  const documentation = (details.model.documentation ?? []).map((doc) => ({
    docId: Number(doc.docId ?? 0),
    title: String(doc.title ?? ""),
    content: String(doc.content ?? ""),
    modelId: Number((doc as any).modelId ?? details.model.modelId),
    modelName: String((doc as any).modelName ?? details.model.fullname),
    createdAt: String((doc as any).createdAt ?? details.model.createdAt),
    updatedAt: String((doc as any).updatedAt ?? details.model.updatedAt ?? details.model.createdAt),
  }));

  return {
    model: toAdminModel(details.model),
    billing: details.billing,
    documentation,
    tasks: details.tasks,
  };
}

export async function adminFetchProviders(): Promise<ProviderResponse[]> {
  return apiFetchProviders();
}

export async function adminFetchBillingInsights(): Promise<BillingInsightsResponse> {
  return apiGetAdminBillingInsights();
}

export async function adminFetchBillingConfigs(): Promise<BillingConfigResponse[]> {
  return apiListBillingConfigs();
}

export async function adminFetchBillingConfigById(billingId: number): Promise<BillingConfigResponse> {
  return apiGetBillingConfigById(billingId);
}

export async function adminFetchBillingConfigByModel(modelId: number): Promise<BillingConfigResponse> {
  return apiGetBillingConfigByModel(modelId);
}

export async function adminCreateBillingConfig(body: BillingConfigCreateBody): Promise<BillingConfigResponse> {
  return apiCreateBillingConfig(body);
}

export async function adminUpdateBillingConfig(billingId: number, body: BillingConfigUpdateBody): Promise<BillingConfigResponse> {
  return apiUpdateBillingConfig(billingId, body);
}

export async function adminDeleteBillingConfig(billingId: number): Promise<void> {
  return apiDeleteBillingConfig(billingId);
}

export async function adminFetchUsageByTask(taskId: string): Promise<UsageRecordResponse[]> {
  return apiGetAdminUsageByTask(taskId);
}

export async function adminFetchUsageSummaryByApiKey(apiKeyId: number, from: string, to: string): Promise<UsageSummaryResponse> {
  return apiGetAdminUsageSummaryByApiKey(apiKeyId, from, to);
}

export async function adminFetchUsageSummaryByModel(apiKeyId: number, from: string, to: string): Promise<UsageSummaryResponse> {
  return apiGetAdminUsageSummaryByModel(apiKeyId, from, to);
}

export async function adminFetchDocumentationByModel(modelId: number): Promise<DocumentationResponse[]> {
  return apiListDocumentationByModel(modelId);
}

export async function adminCreateDocumentation(modelId: number, body: DocumentationCreateBody): Promise<DocumentationResponse> {
  return apiCreateDocumentation(modelId, body);
}

export async function adminUpdateDocumentation(docId: number, body: DocumentationUpdateBody): Promise<DocumentationResponse> {
  return apiUpdateDocumentation(docId, body);
}

export async function adminDeleteDocumentation(docId: number): Promise<void> {
  return apiDeleteDocumentation(docId);
}

export async function adminUpdateProvider(providerId: number, body: { providerName?: string; providerCountry?: string; companyName?: string; logo?: string; }): Promise<ProviderResponse> {
  return apiUpdateProvider(providerId, body);
}

export async function adminChangeProviderStatus(providerId: number, status: string): Promise<ProviderResponse> {
  return apiChangeProviderStatus(providerId, status as any);
}

export async function adminDeleteProvider(providerId: number): Promise<void> {
  return apiDeleteProvider(providerId);
}

export async function adminFetchTasks(): Promise<AdminTask[]> {
  return mock(adminTasks);
}

export async function adminFetchUsageRecords(): Promise<AdminUsageRecord[]> {
  return mock(adminUsageRecords);
}

export async function adminFetchTransactions(): Promise<AdminTransaction[]> {
  return mock(adminTransactions);
}

export async function adminFetchWorkers(): Promise<AdminWorkerInstance[]> {
  return mock(adminWorkerInstances);
}

export async function adminFetchServiceTokens(): Promise<AdminServiceToken[]> {
  return mock(adminServiceTokens);
}

export function adminGetHourlyTaskVolumeToday() {
  return adminHourlyTaskVolumeToday;
}

export function adminGetRevenueTodayByHour() {
  return adminRevenueTodayByHour;
}

export function adminGetRevenueYesterdayByHour() {
  return adminRevenueYesterdayByHour;
}

export function adminGetRevenueSevenDaysAgoByHour() {
  return adminRevenueSevenDaysAgoByHour;
}

export function adminGetRevenueSeriesForDashboard() {
  return [
    { key: "today", stroke: "#09090b", width: 2, dash: undefined, data: adminRevenueTodayByHour },
    { key: "yesterday", stroke: "#a1a1aa", width: 1.5, dash: undefined, data: adminRevenueYesterdayByHour },
    { key: "7days", stroke: "#d4d4d8", width: 1.5, dash: "4 4", data: adminRevenueSevenDaysAgoByHour },
  ];
}

export async function adminCreateProvider(input: {
  name: string;
  company?: string;
  country?: string;
  logo?: string;
}): Promise<void> {
  await apiCreateProvider({
    providerName: input.name,
    providerCountry: input.country ?? "",
    companyName: input.company ?? "",
    logo: input.logo,
  });
}

