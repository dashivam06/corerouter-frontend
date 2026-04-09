import {
  activateServiceToken as apiActivateServiceToken,
  createServiceToken as apiCreateServiceToken,
  createBillingConfig as apiCreateBillingConfig,
  createDocumentation as apiCreateDocumentation,
  createProvider as apiCreateProvider,
  deleteServiceToken as apiDeleteServiceToken,
  deleteBillingConfig as apiDeleteBillingConfig,
  deleteDocumentation as apiDeleteDocumentation,
  deleteProvider as apiDeleteProvider,
  deleteApiKey as apiDeleteApiKey,
  fetchProviders as apiFetchProviders,
  getAdminBillingInsights as apiGetAdminBillingInsights,
  getAdminApiKeyAnalytics as apiGetAdminApiKeyAnalytics,
  getAdminApiKeyInsights as apiGetAdminApiKeyInsights,
  getAdminApiKeyList as apiGetAdminApiKeyList,
  getAdminTaskAnalytics as apiGetAdminTaskAnalytics,
  getAdminTaskInsights as apiGetAdminTaskInsights,
  getAdminTaskList as apiGetAdminTaskList,
  getAdminDashboardOverview as apiGetAdminDashboardOverview,
  getAdminTechnicalHealth as apiGetAdminTechnicalHealth,
  getAdminTechnicalOverview as apiGetAdminTechnicalOverview,
  getAdminTechnicalLogs as apiGetAdminTechnicalLogs,
  getAdminTechnicalErrors as apiGetAdminTechnicalErrors,
  getAdminTechnicalWarnings as apiGetAdminTechnicalWarnings,
  getAdminTechnicalFailedJobs as apiGetAdminTechnicalFailedJobs,
  getAdminTechnicalAlerts as apiGetAdminTechnicalAlerts,
  getAdminTechnicalTotalRequests as apiGetAdminTechnicalTotalRequests,
  getAdminTechnicalFailedRequests as apiGetAdminTechnicalFailedRequests,
  getAdminTechnicalErrorRate as apiGetAdminTechnicalErrorRate,
  getAdminTechnicalAverageResponseTime as apiGetAdminTechnicalAverageResponseTime,
  getAdminTechnicalP95ResponseTime as apiGetAdminTechnicalP95ResponseTime,
  getAdminTechnicalRequestsOverTime as apiGetAdminTechnicalRequestsOverTime,
  getAdminTechnicalFailedRequestsOverTime as apiGetAdminTechnicalFailedRequestsOverTime,
  getAdminTechnicalTopEndpoints as apiGetAdminTechnicalTopEndpoints,
  getAdminModelControlDetails as apiGetAdminModelControlDetails,
  getAdminEarnings as apiGetAdminEarnings,
  getAdminPaginatedTransactions as apiGetAdminPaginatedTransactions,
  getAdminUsageByTask as apiGetAdminUsageByTask,
  getAdminModelDetails as apiGetAdminModelDetails,
  getAdminTransactions as apiGetAdminTransactions,
  getServiceToken as apiGetServiceToken,
  getAllModels,
  getBillingConfigByModel as apiGetBillingConfigByModel,
  getBillingConfigById as apiGetBillingConfigById,
  getAdminUsageSummaryByApiKey as apiGetAdminUsageSummaryByApiKey,
  getAdminUsageSummaryByModel as apiGetAdminUsageSummaryByModel,
  getAdminUserAnalytics as apiGetAdminUserAnalytics,
  getAdminUserInsights as apiGetAdminUserInsights,
  getAdminUserList as apiGetAdminUserList,
  listServiceTokens as apiListServiceTokens,
  revokeServiceToken as apiRevokeServiceToken,
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
  type AdminDashboardOverviewResponse,
  type TechnicalHealthResponse,
  type TechnicalOverviewResponse,
  type CursorPagedResponse,
  type TechnicalLogItem,
  type TechnicalErrorItem,
  type TechnicalWarningItem,
  type TechnicalFailedJobItem,
  type TechnicalAlertItem,
  type KqlResponse,
  type TechnicalRange,
  type BillingInsightsResponse,
  type EarningsDataResponse,
  type EarningsFilterPeriod,
  type CreateServiceTokenBody,
  type CreateServiceTokenResponse,
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
  type AdminTaskAnalyticsResponse,
  type AdminTaskStatusFilter,
  type DailyTaskAnalyticsResponse,
  type PaginatedTaskListResponse,
  type TaskListItemResponse,
  type TaskInsightsResponse,
  type PaginatedResponse,
  type PaginatedUserListResponse,
  type ProviderResponse,
  type RecordUsageBody,
  type ServiceTokenResponse,
  type TransactionResponse,
  type TransactionStatus,
  type TransactionDateFilter,
  type TransactionType,
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
  adminTasks,
  adminUsageRecords,
  adminUsers,
  adminWorkerInstances,
  type AdminApiKey,
  type AdminModel,
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

function toAdminTransactionView(tx: TransactionResponse): AdminTransaction {
  return {
    transaction_id: tx.transactionId,
    amount: tx.amount,
    completed_at: tx.completedAt,
    created_at: tx.createdAt,
    esewa_transaction_id: tx.esewaTransactionId,
    product_code: null,
    status: tx.status,
    type: tx.type,
    user_id: tx.userId,
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
      };
    }),
    totalCreated: toNumber(source.totalCreated ?? source.created ?? source.createdCount ?? source.total_created ?? source.created_count),
    totalRevoked: toNumber(source.totalRevoked ?? source.revoked ?? source.revokedCount ?? source.total_revoked ?? source.revoked_count),
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
}): Promise<{ page: number; size: number; totalElements: number; totalPages: number; lastPage: boolean; isLastPage: boolean; apiKeys: AdminApiKeyListItemView[] }> {
  const result = await apiGetAdminApiKeyList(params);
  return {
    ...result,
    lastPage: result.lastPage ?? result.isLastPage ?? false,
    isLastPage: result.lastPage ?? result.isLastPage ?? false,
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

export type AdminTaskInsightsView = TaskInsightsResponse;

export type AdminTaskAnalyticsView = {
  fromDate: string;
  toDate: string;
  statusFilter: AdminTaskStatusFilter;
  dailyAnalytics: DailyTaskAnalyticsResponse[];
  totalTasks: number;
  completed: number;
  failed: number;
  processing: number;
  queued: number;
};

export async function adminFetchTaskInsights(): Promise<AdminTaskInsightsView> {
  const insights = await apiGetAdminTaskInsights();
  return {
    totalTasks: toNumber(insights.totalTasks),
    completed: toNumber(insights.completed),
    failed: toNumber(insights.failed),
    processing: toNumber(insights.processing),
    queued: toNumber(insights.queued),
  };
}

export async function adminFetchTaskAnalytics(params: {
  from: string;
  to: string;
  status: AdminTaskStatusFilter;
}): Promise<AdminTaskAnalyticsView> {
  const analytics: AdminTaskAnalyticsResponse = await apiGetAdminTaskAnalytics(params);
  return {
    fromDate: analytics.fromDate,
    toDate: analytics.toDate,
    statusFilter: analytics.statusFilter,
    dailyAnalytics: (analytics.dailyAnalytics ?? []).map((item) => ({
      date: item.date,
      total: toNumber(item.total),
      queued: toNumber(item.queued),
      processing: toNumber(item.processing),
      completed: toNumber(item.completed),
      failed: toNumber(item.failed),
    })),
    totalTasks: toNumber(analytics.totalTasks),
    completed: toNumber(analytics.completed),
    failed: toNumber(analytics.failed),
    processing: toNumber(analytics.processing),
    queued: toNumber(analytics.queued),
  };
}

export type AdminTaskListPageView = PaginatedTaskListResponse;
export type AdminTaskListItemView = TaskListItemResponse;

export async function adminFetchTaskList(params: {
  page: number;
  size: number;
  status: AdminTaskStatusFilter;
}): Promise<AdminTaskListPageView> {
  const response = await apiGetAdminTaskList(params);
  return {
    page: toNumber(response.page),
    size: toNumber(response.size),
    totalElements: toNumber(response.totalElements),
    totalPages: toNumber(response.totalPages),
    lastPage: Boolean(response.lastPage),
    tasks: (response.tasks ?? []).map((task) => ({
      taskId: String(task.taskId ?? ""),
      status: task.status,
      apiKeyId: task.apiKeyId == null ? null : toNumber(task.apiKeyId),
      modelId: task.modelId == null ? null : toNumber(task.modelId),
      createdAt: String(task.createdAt ?? ""),
      updatedAt: task.updatedAt ? String(task.updatedAt) : null,
      completedAt: task.completedAt ? String(task.completedAt) : null,
      processingTimeMs:
        task.processingTimeMs == null ? null : toNumber(task.processingTimeMs),
    })),
  };
}

export async function adminFetchUsageRecords(): Promise<AdminUsageRecord[]> {
  return mock(adminUsageRecords);
}

export type AdminBillingFilterPeriod = EarningsFilterPeriod;
export type AdminBillingTransactionType = TransactionType;
export type AdminBillingTransactionStatus = TransactionStatus;
export type AdminTransactionDateFilter = TransactionDateFilter;
export type AdminEarningsData = EarningsDataResponse;
export type AdminBillingTransaction = AdminTransaction;
export type AdminDashboardOverview = AdminDashboardOverviewResponse;
export type AdminTechnicalHealth = TechnicalHealthResponse;
export type AdminTechnicalOverview = TechnicalOverviewResponse;
export type AdminTechnicalLogsPage = CursorPagedResponse<TechnicalLogItem>;
export type AdminTechnicalErrorsPage = CursorPagedResponse<TechnicalErrorItem>;
export type AdminTechnicalWarningsPage = CursorPagedResponse<TechnicalWarningItem>;
export type AdminTechnicalFailedJobsPage = CursorPagedResponse<TechnicalFailedJobItem>;
export type AdminTechnicalAlertsPage = CursorPagedResponse<TechnicalAlertItem>;
export type AdminKqlResponse = KqlResponse;
export type AdminTechnicalRange = TechnicalRange;

export type AdminPaginatedTransactions = PaginatedResponse<TransactionResponse>;
export type AdminTransactionListItem = TransactionResponse;

export async function adminFetchDashboardOverview(): Promise<AdminDashboardOverview> {
  return apiGetAdminDashboardOverview();
}

export async function adminFetchTechnicalHealth(): Promise<AdminTechnicalHealth> {
  return apiGetAdminTechnicalHealth();
}

export async function adminFetchTechnicalOverview(params?: {
  from?: string;
  to?: string;
}): Promise<AdminTechnicalOverview> {
  return apiGetAdminTechnicalOverview(params);
}

export async function adminFetchTechnicalLogs(params?: {
  from?: string;
  to?: string;
  severity?: "ALL" | "INFO" | "WARN" | "ERROR";
  pageSize?: number;
  cursorTimestamp?: string;
  cursorItemId?: string;
}): Promise<AdminTechnicalLogsPage> {
  return apiGetAdminTechnicalLogs(params);
}

export async function adminFetchTechnicalErrors(params?: {
  from?: string;
  to?: string;
  pageSize?: number;
  cursorTimestamp?: string;
  cursorItemId?: string;
}): Promise<AdminTechnicalErrorsPage> {
  return apiGetAdminTechnicalErrors(params);
}

export async function adminFetchTechnicalWarnings(params?: {
  from?: string;
  to?: string;
  pageSize?: number;
  cursorTimestamp?: string;
  cursorItemId?: string;
}): Promise<AdminTechnicalWarningsPage> {
  return apiGetAdminTechnicalWarnings(params);
}

export async function adminFetchTechnicalFailedJobs(params?: {
  from?: string;
  to?: string;
  pageSize?: number;
  cursorTimestamp?: string;
  cursorItemId?: string;
}): Promise<AdminTechnicalFailedJobsPage> {
  return apiGetAdminTechnicalFailedJobs(params);
}

export async function adminFetchTechnicalAlerts(params?: {
  from?: string;
  to?: string;
  severity?: "ALL" | "WARN" | "ERROR";
  pageSize?: number;
  cursorTimestamp?: string;
  cursorItemId?: string;
}): Promise<AdminTechnicalAlertsPage> {
  return apiGetAdminTechnicalAlerts(params);
}

export async function adminFetchTechnicalTotalRequests(params?: {
  range?: AdminTechnicalRange;
  from?: string;
  to?: string;
}): Promise<AdminKqlResponse> {
  return apiGetAdminTechnicalTotalRequests(params);
}

export async function adminFetchTechnicalFailedRequests(params?: {
  range?: AdminTechnicalRange;
  from?: string;
  to?: string;
}): Promise<AdminKqlResponse> {
  return apiGetAdminTechnicalFailedRequests(params);
}

export async function adminFetchTechnicalErrorRate(params?: {
  range?: AdminTechnicalRange;
  from?: string;
  to?: string;
}): Promise<AdminKqlResponse> {
  return apiGetAdminTechnicalErrorRate(params);
}

export async function adminFetchTechnicalAverageResponseTime(params?: {
  range?: AdminTechnicalRange;
  from?: string;
  to?: string;
}): Promise<AdminKqlResponse> {
  return apiGetAdminTechnicalAverageResponseTime(params);
}

export async function adminFetchTechnicalP95ResponseTime(params?: {
  range?: AdminTechnicalRange;
  from?: string;
  to?: string;
}): Promise<AdminKqlResponse> {
  return apiGetAdminTechnicalP95ResponseTime(params);
}

export async function adminFetchTechnicalRequestsOverTime(params?: {
  range?: AdminTechnicalRange;
  from?: string;
  to?: string;
}): Promise<AdminKqlResponse> {
  return apiGetAdminTechnicalRequestsOverTime(params);
}

export async function adminFetchTechnicalFailedRequestsOverTime(params?: {
  range?: AdminTechnicalRange;
  from?: string;
  to?: string;
}): Promise<AdminKqlResponse> {
  return apiGetAdminTechnicalFailedRequestsOverTime(params);
}

export async function adminFetchTechnicalTopEndpoints(params?: {
  range?: AdminTechnicalRange;
  from?: string;
  to?: string;
}): Promise<AdminKqlResponse> {
  return apiGetAdminTechnicalTopEndpoints(params);
}

export async function adminFetchEarnings(params: {
  filterPeriod?: AdminBillingFilterPeriod;
  fromDate?: string;
  toDate?: string;
}): Promise<AdminEarningsData> {
  return apiGetAdminEarnings(params);
}

export async function adminFetchTransactions(params?: {
  transactionType?: AdminBillingTransactionType;
  status?: AdminBillingTransactionStatus;
  filterPeriod?: AdminBillingFilterPeriod;
  fromDate?: string;
  toDate?: string;
}): Promise<AdminBillingTransaction[]> {
  const list = await apiGetAdminTransactions(params ?? {});
  return list.map(toAdminTransactionView);
}

export async function adminFetchTransactionsPage(params: {
  page?: number;
  size?: number;
  dateFilter?: AdminTransactionDateFilter;
  type?: AdminBillingTransactionType;
  status?: AdminBillingTransactionStatus;
  search?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<AdminPaginatedTransactions> {
  return apiGetAdminPaginatedTransactions(params);
}

export async function adminFetchWorkers(): Promise<AdminWorkerInstance[]> {
  return mock(adminWorkerInstances);
}

export type AdminServiceTokenView = ServiceTokenResponse;
export type AdminCreateServiceTokenBody = CreateServiceTokenBody;
export type AdminCreateServiceTokenResult = CreateServiceTokenResponse;

export async function adminFetchServiceTokens(): Promise<AdminServiceTokenView[]> {
  return apiListServiceTokens();
}

export async function adminGetServiceToken(tokenId: string): Promise<AdminServiceTokenView> {
  return apiGetServiceToken(tokenId);
}

export async function adminCreateServiceToken(
  body: AdminCreateServiceTokenBody
): Promise<AdminCreateServiceTokenResult> {
  return apiCreateServiceToken(body);
}

export async function adminRevokeServiceToken(tokenId: string): Promise<void> {
  await apiRevokeServiceToken(tokenId);
}

export async function adminActivateServiceToken(tokenId: string): Promise<void> {
  await apiActivateServiceToken(tokenId);
}

export async function adminDeleteServiceToken(tokenId: string): Promise<void> {
  await apiDeleteServiceToken(tokenId);
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

