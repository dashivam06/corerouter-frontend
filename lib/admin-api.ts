import {
  createBillingConfig as apiCreateBillingConfig,
  createDocumentation as apiCreateDocumentation,
  createProvider as apiCreateProvider,
  deleteBillingConfig as apiDeleteBillingConfig,
  deleteDocumentation as apiDeleteDocumentation,
  deleteProvider as apiDeleteProvider,
  fetchProviders as apiFetchProviders,
  getAdminBillingInsights as apiGetAdminBillingInsights,
  getAdminModelControlDetails as apiGetAdminModelControlDetails,
  getAdminUsageByTask as apiGetAdminUsageByTask,
  getAdminModelDetails as apiGetAdminModelDetails,
  getAllModels,
  getBillingConfigByModel as apiGetBillingConfigByModel,
  getBillingConfigById as apiGetBillingConfigById,
  getAdminUsageSummaryByApiKey as apiGetAdminUsageSummaryByApiKey,
  getAdminUsageSummaryByModel as apiGetAdminUsageSummaryByModel,
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
  type ModelControlDetailsResponse,
  type DocumentationCreateBody,
  type DocumentationResponse,
  type DocumentationUpdateBody,
  type ModelResponse,
  type ProviderResponse,
  type RecordUsageBody,
  type UsageRecordResponse,
  type UsageSummaryResponse,
} from "@/lib/api";

import {
  adminApiKeys,
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

export async function adminFetchApiKeys(): Promise<AdminApiKey[]> {
  return mock(adminApiKeys);
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

