/**
 * Temporary admin API (mock UI only). Replace with real fetch() calls later.
 */

import { getAuthTokenStorage } from "@/lib/auth";

import {
  adminApiKeys,
  adminHourlyTaskVolumeToday,
  adminModels,
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

export async function adminFetchUsers(): Promise<AdminUser[]> {
  return mock(adminUsers);
}

export async function adminFetchApiKeys(): Promise<AdminApiKey[]> {
  return mock(adminApiKeys);
}

export async function adminFetchModels(): Promise<AdminModel[]> {
  return mock(adminModels);
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
  logo: string;
}): Promise<void> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.corerouter.me"
  ).replace(/\/$/, "");

  const token = getAuthTokenStorage();
  const response = await fetch(`${baseUrl}/api/v1/admin/providers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  if (response.ok) {
    return;
  }

  let message = "Failed to create provider.";
  try {
    const payload = (await response.json()) as {
      message?: string;
    };
    if (payload?.message) {
      message = payload.message;
    }
  } catch {
    // Keep generic error message.
  }

  throw new Error(message);
}

