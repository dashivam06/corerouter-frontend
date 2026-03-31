/**
 * Temporary mock API — swap `mockRequest` calls for real fetch() to your backend.
 */

import type { MockUser, MockApiKey } from "@/lib/mock-data";
import {
  mockActivity,
  mockApiDocs,
  mockApiKeys as seedApiKeys,
  mockBilling,
  mockCreditsUsedLastMonth,
  mockCreditsUsedThisMonth,
  mockDashboardPie,
  mockModels,
  mockSpendSeries,
  mockTasks,
  mockTransactions,
  mockUsageRecords,
  mockUser,
  buildBalanceHistory,
  type MockTask,
  type MockTransaction,
  type MockUsageRecord,
} from "@/lib/mock-data";

const delay = (ms = 280) => new Promise((r) => setTimeout(r, ms));

let runtimeApiKeys = structuredClone(seedApiKeys) as MockApiKey[];

async function mockRequest<T>(data: T): Promise<T> {
  await delay();
  return structuredClone(data) as T;
}

export async function loginSendEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  await delay();
  if (!email.includes("@")) return { ok: false, error: "Enter a valid email address." };
  return { ok: true };
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<{ user: MockUser; accessToken: string; error?: string }> {
  await delay();
  if (!password || password.length < 1)
    return { user: mockUser, accessToken: "", error: "Password is required." };
  return {
    user: { ...mockUser, email, last_login: new Date().toISOString() },
    accessToken: "mock_access_" + btoa(email).slice(0, 24),
  };
}

export async function registerSendOtp(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  await delay();
  if (!email.includes("@")) return { ok: false, error: "Enter a valid email address." };
  return { ok: true };
}

export async function verifyOtp(
  _email: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  await delay();
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit code from your email." };
  }
  return { ok: true };
}

export async function completeRegistration(body: {
  email: string;
  full_name: string;
  password: string;
}): Promise<{ user: MockUser; accessToken: string; error?: string }> {
  await delay();
  if (body.password.length < 8)
    return {
      user: mockUser,
      accessToken: "",
      error: "Password must be at least 8 characters.",
    };
  return {
    user: {
      ...mockUser,
      email: body.email,
      full_name: body.full_name,
      profile_image: null,
    },
    accessToken: "mock_access_new",
  };
}

export async function fetchCurrentUser(): Promise<MockUser> {
  return mockRequest(mockUser);
}

export async function fetchApiKeys(): Promise<MockApiKey[]> {
  await delay();
  return structuredClone(runtimeApiKeys);
}

export async function createApiKey(description: string): Promise<MockApiKey> {
  await delay();
  const key: MockApiKey = {
    api_key_id: Date.now(),
    created_at: new Date().toISOString(),
    daily_limit: 5000,
    daily_used: 0,
    description: description || "Untitled",
    key:
      "cr_demo_" +
      Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join(""),
    last_used_at: null,
    monthly_limit: 100_000,
    monthly_used: 0,
    status: "ACTIVE",
    user_id: mockUser.user_id,
  };
  runtimeApiKeys = [...runtimeApiKeys, key];
  return key;
}

export async function deleteApiKey(id: number): Promise<void> {
  await delay();
  runtimeApiKeys = runtimeApiKeys.filter((k) => k.api_key_id !== id);
}

export async function deactivateApiKey(id: number): Promise<void> {
  await delay();
  runtimeApiKeys = runtimeApiKeys.map((k) =>
    k.api_key_id === id ? { ...k, status: "INACTIVE" as const } : k
  );
}

export async function fetchModels() {
  return mockRequest(mockModels.filter((m) => m.status === "ACTIVE"));
}

export async function fetchModelDocs(modelId: number) {
  return mockRequest(
    mockApiDocs.filter((d) => d.model_id === modelId && d.active)
  );
}

export async function fetchBillingForModel(modelId: number) {
  return mockRequest(mockBilling.find((b) => b.model_id === modelId) ?? null);
}

export async function fetchTasks(): Promise<MockTask[]> {
  return mockRequest(mockTasks);
}

export async function fetchUsageForTask(taskId: string): Promise<MockUsageRecord[]> {
  return mockRequest(mockUsageRecords.filter((u) => u.task_id === taskId));
}

export async function fetchTransactions(): Promise<MockTransaction[]> {
  return mockRequest(mockTransactions);
}

export async function fetchActivity() {
  return mockRequest(mockActivity);
}

export function getSpendSeries(mode: keyof typeof mockSpendSeries) {
  return mockSpendSeries[mode] ?? mockSpendSeries.month;
}

export function getDashboardPie() {
  return mockDashboardPie;
}

export function getBalanceHistory(balance: number) {
  return buildBalanceHistory(balance);
}

export function getCreditsComparison() {
  return { thisMonth: mockCreditsUsedThisMonth, lastMonth: mockCreditsUsedLastMonth };
}
