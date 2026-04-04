import { createProvider as apiCreateProvider, fetchProviders as apiFetchProviders, getAllModels, type ModelResponse, type ProviderResponse } from "@/lib/api";

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
    updated_at: model.updatedAt,
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

export async function adminFetchProviders(): Promise<ProviderResponse[]> {
  return apiFetchProviders();
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

