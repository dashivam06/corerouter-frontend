/**
 * Backend auth API integration + mock data helpers for non-auth dashboard resources.
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
import {
  clearAllAuthClientTokens,
  getAuthTokenStorage,
  getRefreshTokenCookie,
  setAuthTokenStorage,
  setRefreshTokenCookie,
  userFromAccessToken,
} from "@/lib/auth";

const delay = (ms = 280) => new Promise((r) => setTimeout(r, ms));

let runtimeApiKeys = structuredClone(seedApiKeys) as MockApiKey[];

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.corerouter.me"
).replace(/\/$/, "");
const AUTH_BASE = `${API_BASE_URL}/api/v1/auth`;
const USER_PROFILE_BASE = `${API_BASE_URL}/api/v1/user/profile`;

type ValidationErrorItem = {
  field: string;
  message: string;
};

type ApiEnvelope<T> = {
  timestamp: string;
  status: number;
  success: boolean;
  message: string;
  path: string;
  method: string;
  data: T | null;
  errors?: ValidationErrorItem[];
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

type RequestOtpResponse = {
  verificationId: string;
};

type VerifyOtpResponse = {
  verificationId: string;
  message: string;
  verified: boolean;
  profileCompletionTtlMinutes: number;
};

type UserProfileResponse = {
  userId: number;
  fullName: string;
  email: string;
  profileImage: string | null;
  emailSubscribed?: boolean;
  status: string;
};

export class ApiRequestError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, errors: ValidationErrorItem[] = []) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.fieldErrors = errors.reduce<Record<string, string>>((acc, err) => {
      if (err?.field && err?.message) acc[err.field] = err.message;
      return acc;
    }, {});
  }
}

function fallbackMessage(status: number): string {
  if (status === 404) return "Not found";
  if (status === 503) return "Service temporarily unavailable. Please try again later.";
  if (status >= 500) return "Something went wrong on our end. Please try again.";
  return "Something went wrong. Please try again.";
}

function loginErrorMessage(status: number, defaultMessage: string): string {
  if (status === 401) return "Invalid email or password.";
  if (status === 404) return "No account found with this email.";
  if (status === 429) return "Too many login attempts. Please wait before trying again.";
  if (status === 503) return "Service temporarily unavailable. Try again in a moment.";
  if (status === 500) return "Login failed. Please try again.";
  return defaultMessage;
}

function requestOtpErrorMessage(status: number, defaultMessage: string): string {
  if (status === 429) return "Too many OTP requests. Please wait before trying again.";
  if (status === 503) return "Service temporarily unavailable. Please try again later.";
  if (status === 500) return "Something went wrong. Please try again.";
  return defaultMessage;
}

function verifyOtpErrorMessage(status: number, defaultMessage: string): string {
  if (status === 401) return "Verification session is missing or invalid. Please request a new code.";
  if (status === 400) return "Invalid OTP. Please check and try again.";
  if (status === 410) return "OTP has expired. Please request a new one.";
  if (status === 429) return "Too many attempts. Please wait before retrying.";
  return defaultMessage;
}

function registerErrorMessage(status: number, defaultMessage: string): string {
  if (status === 409) return "An account with this email already exists.";
  if (status === 410) return "Session expired. Please restart registration.";
  if (status === 429) return "Too many requests. Please slow down.";
  if (status === 500) return "Registration failed. Please try again.";
  return defaultMessage;
}

function authActionErrorMessage(
  status: number,
  defaultMessage: string,
  kind: "change-password" | "delete-account" | "update-profile"
): string {
  const normalizedMessage = defaultMessage.trim().toLowerCase();

  if (kind === "change-password") {
    if (status === 400) return defaultMessage || "Passwords do not match.";
    if (status === 401) return "Current password is incorrect.";
    if (status === 500) return "Failed to change password. Please try again.";
  }

  if (kind === "delete-account") {
    if (status === 400) return defaultMessage;
    if (status === 401 && normalizedMessage.includes("invalid password")) {
      return defaultMessage;
    }
    if (status === 401) return "Unauthorized. Please log in again.";
    if (status === 500) return "Failed to delete account. Please try again.";
  }

  if (kind === "update-profile") {
    if (status === 400) return defaultMessage;
    if (status === 401) return "Session expired. Please log in again.";
    if (status === 500) return "Failed to update profile. Please try again.";
  }

  return defaultMessage;
}

function redirectToLogin() {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

function toMockUser(profile: UserProfileResponse, fallback?: Partial<MockUser>): MockUser {
  const mappedStatus =
    profile.status === "SUSPENDED"
      ? "SUSPENDED"
      : profile.status === "INACTIVE"
        ? "INACTIVE"
        : profile.status === "DELETED"
          ? "DELETED"
          : profile.status === "BANNED"
            ? "BANNED"
            : "ACTIVE";

  return {
    user_id: profile.userId,
    balance: fallback?.balance ?? 0,
    created_at: fallback?.created_at ?? new Date().toISOString(),
    email: profile.email,
    email_subscribed: profile.emailSubscribed ?? fallback?.email_subscribed ?? true,
    full_name: profile.fullName,
    last_login: new Date().toISOString(),
    profile_image: profile.profileImage,
    role: fallback?.role ?? "USER",
    status: mappedStatus,
  };
}

function buildSessionUser(email: string, fullName?: string): MockUser {
  return {
    user_id: Date.now(),
    balance: 0,
    created_at: new Date().toISOString(),
    email,
    email_subscribed: true,
    full_name: fullName?.trim() || "User",
    last_login: new Date().toISOString(),
    profile_image: null,
    role: "USER",
    status: "ACTIVE",
  };
}

async function parseResponse<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}

async function postAuth<TReq extends Record<string, unknown>, TRes>(
  path: string,
  body: TReq,
  accessToken?: string
): Promise<TRes> {
  const resolvedAccessToken = accessToken || getAuthTokenStorage() || undefined;
  let response: Response;
  try {
    response = await fetch(`${AUTH_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(resolvedAccessToken
          ? { Authorization: `Bearer ${resolvedAccessToken}` }
          : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError(
      "Unable to connect. Check your internet connection.",
      0
    );
  }

  const parsed = await parseResponse<TRes>(response);
  if (!parsed) {
    if (!response.ok) {
      throw new ApiRequestError(fallbackMessage(response.status), response.status);
    }
    throw new ApiRequestError("Unexpected server response.", response.status);
  }

  if (parsed.success) {
    return parsed.data as TRes;
  }

  throw new ApiRequestError(
    parsed.message || fallbackMessage(parsed.status || response.status),
    parsed.status || response.status,
    parsed.errors ?? []
  );
}

async function requestUserProfile<TRes>(
  method: "GET" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string
): Promise<TRes> {
  const resolvedAccessToken = accessToken || getAuthTokenStorage() || undefined;

  if (!resolvedAccessToken) {
    clearAllAuthClientTokens();
    redirectToLogin();
    throw new ApiRequestError("Session expired. Please log in again.", 401);
  }

  const doFetch = async (token: string) => {
    return fetch(`${USER_PROFILE_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    });
  };

  let response: Response;
  try {
    response = await doFetch(resolvedAccessToken);
  } catch {
    throw new ApiRequestError(
      "Unable to connect. Check your internet connection.",
      0
    );
  }

  if (response.status === 401) {
    const parsedUnauthorized = await parseResponse<TRes>(response);
    const unauthorizedMessage = parsedUnauthorized?.message?.trim();
    const unauthorizedMessageNormalized = unauthorizedMessage?.toLowerCase();

    // Some profile actions intentionally return 401 for credential validation.
    // Do not refresh/retry for these, so the UI can show field-level feedback.
    if (
      unauthorizedMessageNormalized?.includes("invalid password") ||
      unauthorizedMessageNormalized?.includes("invalid old password")
    ) {
      throw new ApiRequestError(
        unauthorizedMessage || "Invalid password",
        parsedUnauthorized?.status || response.status,
        parsedUnauthorized?.errors ?? []
      );
    }

    const refreshToken = getRefreshTokenCookie();
    if (!refreshToken) {
      clearAllAuthClientTokens();
      redirectToLogin();
      throw new ApiRequestError("Session expired. Please log in again.", 401);
    }

    try {
      const nextTokens = await refreshAuthToken(refreshToken);
      setAuthTokenStorage(nextTokens.accessToken);
      setRefreshTokenCookie(nextTokens.refreshToken);
      response = await doFetch(nextTokens.accessToken);
    } catch {
      clearAllAuthClientTokens();
      redirectToLogin();
      throw new ApiRequestError("Session expired. Please log in again.", 401);
    }
  }

  const parsed = await parseResponse<TRes>(response);
  if (!parsed) {
    if (!response.ok) {
      throw new ApiRequestError(fallbackMessage(response.status), response.status);
    }
    throw new ApiRequestError("Unexpected server response.", response.status);
  }

  if (parsed.success) {
    return parsed.data as TRes;
  }

  throw new ApiRequestError(
    parsed.message || fallbackMessage(parsed.status || response.status),
    parsed.status || response.status,
    parsed.errors ?? []
  );
}

async function mockRequest<T>(data: T): Promise<T> {
  await delay();
  return structuredClone(data) as T;
}

export async function loginSendEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }
  return { ok: true };
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<{ user: MockUser | null; accessToken: string; refreshToken: string; expiresIn: number; error?: string; status?: number; fieldErrors?: Record<string, string> }> {
  try {
    const data = await postAuth<{ email: string; password: string }, AuthTokens>(
      "/login",
      {
        email: email.trim(),
        password,
      }
    );
    return {
      user: {
        ...(userFromAccessToken(data.accessToken) ??
          buildSessionUser(email.trim())),
      },
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return {
        user: null,
        accessToken: "",
        refreshToken: "",
        expiresIn: 0,
        error: loginErrorMessage(error.status, error.message),
        status: error.status,
        fieldErrors: error.fieldErrors,
      };
    }
    return { user: null, accessToken: "", refreshToken: "", expiresIn: 0, error: "Login failed. Please try again." };
  }
}

export async function registerSendOtp(
  email: string
): Promise<{ ok: boolean; verificationId?: string; error?: string; status?: number; fieldErrors?: Record<string, string> }> {
  try {
    const data = await postAuth<{ email: string }, RequestOtpResponse>("/request-otp", {
      email: email.trim(),
    });
    return { ok: true, verificationId: data.verificationId };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return {
        ok: false,
        error: requestOtpErrorMessage(error.status, error.message),
        status: error.status,
        fieldErrors: error.fieldErrors,
      };
    }
    return { ok: false, error: "Could not send code." };
  }
}

export async function verifyOtp(
  verificationId: string,
  code: string
): Promise<{ ok: boolean; data?: VerifyOtpResponse; error?: string; status?: number; fieldErrors?: Record<string, string> }> {
  try {
    const data = await postAuth<{ verificationId: string; otp: string }, VerifyOtpResponse>(
      "/verify-otp",
      {
        verificationId,
        otp: code,
      }
    );
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return {
        ok: false,
        error: verifyOtpErrorMessage(error.status, error.message),
        status: error.status,
        fieldErrors: error.fieldErrors,
      };
    }
    return { ok: false, error: "Invalid code." };
  }
}

export async function completeRegistration(body: {
  verificationId: string;
  email: string;
  full_name: string;
  password: string;
  confirmPassword: string;
}): Promise<{ user: MockUser | null; accessToken: string; refreshToken: string; expiresIn: number; error?: string; status?: number; fieldErrors?: Record<string, string> }> {
  try {
    const data = await postAuth<
      { verificationId: string; fullName: string; password: string; confirmPassword: string },
      AuthTokens
    >("/register", {
      verificationId: body.verificationId,
      fullName: body.full_name,
      password: body.password,
      confirmPassword: body.confirmPassword,
    });

    return {
      user: {
        ...(userFromAccessToken(data.accessToken) ??
          buildSessionUser(body.email, body.full_name)),
      },
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return {
        user: null,
        accessToken: "",
        refreshToken: "",
        expiresIn: 0,
        error: registerErrorMessage(error.status, error.message),
        status: error.status,
        fieldErrors: error.fieldErrors,
      };
    }
    return {
      user: null,
      accessToken: "",
      refreshToken: "",
      expiresIn: 0,
      error: "Registration failed. Please try again.",
    };
  }
}

export async function refreshAuthToken(refreshToken: string): Promise<AuthTokens> {
  return postAuth<{ refreshToken: string }, AuthTokens>("/refresh", { refreshToken });
}

export async function logoutAuth(refreshToken: string): Promise<void> {
  try {
    await postAuth<{ refresh_token: string }, null>("/logout", {
      refresh_token: refreshToken,
    });
  } catch (error) {
    if (error instanceof ApiRequestError && (error.status === 400 || error.status >= 500)) {
      return;
    }
    throw error;
  }
}

export async function getProfile(
  accessToken: string,
  fallback?: Partial<MockUser>
): Promise<MockUser> {
  const data = await requestUserProfile<UserProfileResponse>("GET", "", undefined, accessToken);
  return toMockUser(data, fallback);
}

export async function updateProfile(
  accessToken: string,
  body: { fullName?: string; profileImage?: string; emailSubscribed?: boolean }
): Promise<MockUser> {
  try {
    const data = await requestUserProfile<UserProfileResponse>("PATCH", "", body, accessToken);
    return toMockUser(data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      const message =
        error.status === 400 && error.message === "Deleted account cannot be updated"
          ? error.message
          : authActionErrorMessage(error.status, error.message, "update-profile");
      throw new ApiRequestError(
        message,
        error.status,
        error.fieldErrors ? Object.entries(error.fieldErrors).map(([field, message]) => ({ field, message })) : []
      );
    }
    throw error;
  }
}

export async function changePassword(
  accessToken: string,
  body: { currentPassword: string; newPassword: string; confirmPassword: string }
): Promise<void> {
  const payload = {
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
    confirmPassword: body.confirmPassword,
  };

  try {
    await requestUserProfile<null>("PATCH", "/password", payload, accessToken);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      const fieldErrors = error.fieldErrors ? Object.entries(error.fieldErrors).map(([field, message]) => ({ field, message })) : [];
      if (error.status === 400 && error.message === "New password and confirm password do not match") {
        fieldErrors.push({ field: "confirmPassword", message: "New password and confirm password do not match" });
      }
      if (error.status === 400 && error.message === "New password must be different from the current password") {
        fieldErrors.push({ field: "newPassword", message: "New password must be different from the current password" });
      }
      if (error.status === 401 && error.message === "Invalid old password") {
        fieldErrors.push({ field: "currentPassword", message: "Current password is incorrect" });
      }
      throw new ApiRequestError(
        authActionErrorMessage(error.status, error.message, "change-password"),
        error.status,
        fieldErrors
      );
    }
    throw error;
  }
}

export async function deleteAccount(
  accessToken: string,
  body: { password: string }
): Promise<void> {
  try {
    // Backend expects DELETE /api/v1/user/profile (without trailing slash).
    // Send both key variants to stay compatible across deployments.
    await requestUserProfile<null>(
      "DELETE",
      "",
      { password: body.password, currentPassword: body.password },
      accessToken
    );
  } catch (error) {
    if (error instanceof ApiRequestError) {
      const fieldErrors = error.fieldErrors ? Object.entries(error.fieldErrors).map(([field, message]) => ({ field, message })) : [];
      if (error.status === 401 && error.message.toLowerCase().includes("invalid password")) {
        fieldErrors.push({ field: "password", message: "Incorrect password" });
      }
      throw new ApiRequestError(
        authActionErrorMessage(error.status, error.message, "delete-account"),
        error.status,
        fieldErrors
      );
    }
    throw error;
  }
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
