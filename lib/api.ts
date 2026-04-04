/**
 * Backend auth API integration + mock data helpers for non-auth dashboard resources.
 */

import type { MockUser } from "@/lib/mock-data";
import {
  mockActivity,
  mockApiDocs,
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

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.corerouter.me"
).replace(/\/$/, "");
const AUTH_BASE = `${API_BASE_URL}/api/v1/auth`;
const USER_PROFILE_BASE = `${API_BASE_URL}/api/v1/user/profile`;
const API_KEYS_BASE = `${API_BASE_URL}/api/v1/apikeys`;
const MODELS_BASE = `${API_BASE_URL}/api/v1/models`;
const ADMIN_MODELS_BASE = `${API_BASE_URL}/api/v1/admin/models`;
const PROVIDERS_BASE = `${API_BASE_URL}/api/v1/providers`;
const BILLING_BASE = `${API_BASE_URL}/api/v1/billing`;
const ADMIN_BILLING_BASE = `${API_BASE_URL}/api/v1/admin/billing`;
const ADMIN_DOCUMENTATION_BASE = `${API_BASE_URL}/api/v1/admin/documentation`;
const ADMIN_USERS_BASE = `${API_BASE_URL}/api/v1/admin/users`;
const WALLET_TOPUP_BASE = `${API_BASE_URL}/api/wallet/topup`;

// API Key Types
export type ApiKeyRecord = {
  apiKeyId: number;
  key: string;
  description: string;
  dailyLimit: number;
  monthlyLimit: number;
  status: "ACTIVE" | "INACTIVE" | "REVOKED" | "EXPIRED";
  createdAt: string;
  lastUsedAt: string | null;
};

type ApiKeyUpdateBody = {
  description?: string;
  dailyLimit?: number;
  monthlyLimit?: number;
};

// Model Types
export type ModelStatus = "ACTIVE" | "INACTIVE" | "DEPRECATED" | "ARCHIVED";

export type ModelResponse = {
  modelId: number;
  fullname: string;
  username: string;
  provider: string;
  status: ModelStatus;
  endpointUrl: string;
  type: string;
  description: string;
  createdAt: string;
  updatedAt: string | null;
};

export type ApiDocumentationResponse = {
  docId?: number;
  title?: string;
  content?: string;
  endpoint?: string;
  example?: string;
  [key: string]: unknown;
};

export type ModelDetailsResponse = ModelResponse & {
  documentation: ApiDocumentationResponse[];
};

export type ModelControlTaskDetailsResponse = {
  taskId?: string;
  [key: string]: unknown;
};

export type ModelControlDetailsResponse = {
  model: ModelDetailsResponse;
  billing: BillingConfigResponse | null;
  tasks: ModelControlTaskDetailsResponse[];
};

export type ModelCreateBody = {
  fullname: string;
  username: string;
  provider: string;
  endpointUrl: string;
  description?: string;
  type: string;
};

export type ModelUpdateBody = {
  fullname?: string;
  username?: string;
  provider?: string;
  endpointUrl?: string;
  description?: string;
  status?: ModelStatus;
};

export type ModelStatusUpdateBody = {
  status: ModelStatus;
  reason?: string;
};

// Billing / Usage Types
export type BillingPricingType = "PER_TOKEN" | "PER_IMAGE" | "PER_REQUEST" | string;

export type BillingConfigResponse = {
  billingId: number;
  modelId: number;
  modelName: string;
  pricingType: BillingPricingType;
  pricingMetadata: string;
  createdAt: string;
  updatedAt: string;
};

export type BillingConfigCreateBody = {
  modelId: number;
  pricingType: BillingPricingType;
  pricingMetadata: string;
};

export type BillingConfigUpdateBody = {
  pricingType?: BillingPricingType;
  pricingMetadata?: string;
};

export type BillingInsightsResponse = {
  totalBalance: number;
  thisMonthVolume: number;
  todayTopUpAmount: number;
};

export type UsageUnitType = "TOKENS" | "IMAGES" | "SECONDS" | "REQUESTS" | string;

export type UsageRecordResponse = {
  usageId: number;
  taskId: string;
  modelId: number;
  modelName: string;
  apiKeyId: number;
  usageUnitType: UsageUnitType;
  quantity: number;
  ratePerUnit: number;
  cost: number;
  recordedAt: string;
};

export type UsageSummaryItem = {
  modelId: number | null;
  modelName: string | null;
  usageUnitType: UsageUnitType;
  totalQuantity: number;
  totalCost: number;
  taskCount: number;
};

export type UsageSummaryResponse = {
  periodStart: string;
  periodEnd: string;
  totalCost: number;
  breakdown: UsageSummaryItem[];
};

export type UserBillingInsightsResponse = {
  currentBalance: number;
  creditsUsedThisMonth: number;
  creditsUsedChangeFromLastMonthPercent: number;
};

export type UserUsageInsightsResponse = {
  totalSpend: number;
  totalSpendChangePercent: number;
  totalRequests: number;
  totalRequestsChangePercent: number;
  mostUsedModel: string | null;
  avgCostPerRequest: number;
  avgCostPerRequestChangePercent: number;
};

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BANNED" | "DELETED";

export type UserRole = "USER" | "ADMIN";

export type UserProfileResponse = {
  userId: number;
  fullName: string;
  email: string;
  profileImage: string | null;
  emailSubscribed: boolean;
  status: UserStatus;
  role?: UserRole;
};

export type PaginatedUserListResponse = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  users: UserProfileResponse[];
  isLastPage: boolean;
};

export type AdminUserInsightsResponse = {
  totalUsers: number;
  usersChangeFromPastMonthPercent: number;
  activeUsers: number;
  inactiveUsers: number;
  activeSharePercent: number;
  suspendedUsers: number;
  adminUsers: number;
};

export type DailyUserAnalyticsResponse = {
  date: string;
  created: number;
  deleted: number;
  revoked: number;
};

export type UserAnalyticsResponse = {
  dailyAnalytics: DailyUserAnalyticsResponse[];
  totalCreated: number;
  totalDeleted: number;
  totalRevoked: number;
};

export type PaginatedResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
};

export type RecordUsageBody = {
  taskId: string;
  usageUnitType: UsageUnitType;
  quantity: number;
};

export type TopUpInitiateResponse = Record<string, string>;

export type DocumentationResponse = {
  docId: number;
  title: string;
  content: string;
  modelId: number;
  modelName: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentationCreateBody = {
  title: string;
  content: string;
};

export type DocumentationUpdateBody = {
  title?: string;
  content?: string;
};

// Provider Types
export type ProviderStatus = "ACTIVE" | "DISABLED" | "SUSPENDED" | "DELETED";

export type ProviderResponse = {
  providerId: number;
  providerName: string;
  providerCountry: string;
  companyName: string;
  status: ProviderStatus;
  logo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProviderCreateBody = {
  providerName: string;
  providerCountry: string;
  companyName: string;
  logo?: string;
};

export type ProviderUpdateBody = {
  providerName?: string;
  providerCountry?: string;
  companyName?: string;
  logo?: string;
};

// Admin API Types
export type ModelInsights = {
  totalModels: number;
  activeModels: number;
  providers: number;
};

export type ModelStatusAudit = {
  auditId: number;
  modelId: number;
  changedBy: string;
  changedAt: string;
  status: ModelStatus;
  reason?: string;
};

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

type AuthUserProfileResponse = {
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

function toMockUser(profile: AuthUserProfileResponse, fallback?: Partial<MockUser>): MockUser {
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

async function requestApiKeys<TRes>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
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
    return fetch(`${API_KEYS_BASE}${path}`, {
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

async function requestModels<TRes>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string
): Promise<TRes> {
  const resolvedAccessToken = accessToken || getAuthTokenStorage() || undefined;

  const doFetch = async (token?: string) => {
    return fetch(`${MODELS_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  if (response.status === 401 && resolvedAccessToken) {
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

async function requestAdminModels<TRes>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
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
    return fetch(`${ADMIN_MODELS_BASE}${path}`, {
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

  if (response.status === 403) {
    const parsed = await parseResponse<TRes>(response);
    throw new ApiRequestError(
      "You don't have permission to perform this action.",
      403,
      parsed?.errors ?? []
    );
  }

  if (response.status === 401) {
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

    if (response.status === 403) {
      const parsed = await parseResponse<TRes>(response);
      throw new ApiRequestError(
        "You don't have permission to perform this action.",
        403,
        parsed?.errors ?? []
      );
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

async function requestProviders<TRes>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string,
  requireAuth = false
): Promise<TRes> {
  const resolvedAccessToken = accessToken || getAuthTokenStorage() || undefined;

  if (requireAuth && !resolvedAccessToken) {
    clearAllAuthClientTokens();
    redirectToLogin();
    throw new ApiRequestError("Session expired. Please log in again.", 401);
  }

  const doFetch = async (token?: string) => {
    return fetch(`${PROVIDERS_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  if (response.status === 403) {
    const parsed = await parseResponse<TRes>(response);
    throw new ApiRequestError(
      requireAuth
        ? "You don't have permission to perform this action."
        : fallbackMessage(response.status),
      403,
      parsed?.errors ?? []
    );
  }

  if (response.status === 401 && resolvedAccessToken) {
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

    if (response.status === 403) {
      const parsed = await parseResponse<TRes>(response);
      throw new ApiRequestError(
        requireAuth
          ? "You don't have permission to perform this action."
          : fallbackMessage(response.status),
        403,
        parsed?.errors ?? []
      );
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

async function requestBilling<TRes>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
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
    return fetch(`${BILLING_BASE}${path}`, {
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
    throw new ApiRequestError("Unable to connect. Check your internet connection.", 0);
  }

  if (response.status === 401) {
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

  if (response.status === 403) {
    const parsed = await parseResponse<TRes>(response);
    throw new ApiRequestError(
      "You don't have permission to perform this action.",
      403,
      parsed?.errors ?? []
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

async function requestAdminBilling<TRes>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
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
    return fetch(`${ADMIN_BILLING_BASE}${path}`, {
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
    throw new ApiRequestError("Unable to connect. Check your internet connection.", 0);
  }

  if (response.status === 403) {
    const parsed = await parseResponse<TRes>(response);
    throw new ApiRequestError("You don't have permission to perform this action.", 403, parsed?.errors ?? []);
  }

  if (response.status === 401) {
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

    if (response.status === 403) {
      const parsed = await parseResponse<TRes>(response);
      throw new ApiRequestError("You don't have permission to perform this action.", 403, parsed?.errors ?? []);
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

async function requestAdminDocumentation<TRes>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
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
    return fetch(`${ADMIN_DOCUMENTATION_BASE}${path}`, {
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
    throw new ApiRequestError("Unable to connect. Check your internet connection.", 0);
  }

  if (response.status === 403) {
    const parsed = await parseResponse<TRes>(response);
    throw new ApiRequestError("You don't have permission to perform this action.", 403, parsed?.errors ?? []);
  }

  if (response.status === 401) {
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

    if (response.status === 403) {
      const parsed = await parseResponse<TRes>(response);
      throw new ApiRequestError("You don't have permission to perform this action.", 403, parsed?.errors ?? []);
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

async function requestAdminUsers<TRes>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
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
    return fetch(`${ADMIN_USERS_BASE}${path}`, {
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
    throw new ApiRequestError("Unable to connect. Check your internet connection.", 0);
  }

  if (response.status === 403) {
    const parsed = await parseResponse<TRes>(response);
    throw new ApiRequestError(
      "You don't have permission to perform this action.",
      403,
      parsed?.errors ?? []
    );
  }

  if (response.status === 401) {
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

    if (response.status === 403) {
      const parsed = await parseResponse<TRes>(response);
      throw new ApiRequestError(
        "You don't have permission to perform this action.",
        403,
        parsed?.errors ?? []
      );
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

async function requestWalletTopUp<TRes>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
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
    return fetch(`${WALLET_TOPUP_BASE}${path}`, {
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
    throw new ApiRequestError("Unable to connect. Check your internet connection.", 0);
  }

  if (response.status === 401) {
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

  if (response.status === 403) {
    const parsed = await parseResponse<TRes>(response);
    throw new ApiRequestError("You don't have permission to perform this action.", 403, parsed?.errors ?? []);
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
  const data = await requestUserProfile<AuthUserProfileResponse>("GET", "", undefined, accessToken);
  return toMockUser(data, fallback);
}

export async function updateProfile(
  accessToken: string,
  body: { fullName?: string; profileImage?: string; emailSubscribed?: boolean }
): Promise<MockUser> {
  try {
    const data = await requestUserProfile<AuthUserProfileResponse>("PATCH", "", body, accessToken);
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

export async function fetchApiKeys(): Promise<ApiKeyRecord[]> {
  return requestApiKeys<ApiKeyRecord[]>("GET", "");
}

export async function getApiKeyDetails(
  apiKeyId: number,
  accessToken?: string
): Promise<ApiKeyRecord> {
  return requestApiKeys<ApiKeyRecord>("GET", `/${apiKeyId}`, undefined, accessToken);
}

export async function createApiKey(
  body: { description: string; dailyLimit: number; monthlyLimit: number },
  accessToken?: string
): Promise<ApiKeyRecord> {
  return requestApiKeys<ApiKeyRecord>("POST", "/generate", body, accessToken);
}

export async function updateApiKey(
  apiKeyId: number,
  body: ApiKeyUpdateBody,
  accessToken?: string
): Promise<ApiKeyRecord> {
  return requestApiKeys<ApiKeyRecord>("PUT", `/${apiKeyId}`, body, accessToken);
}

export async function enableApiKey(
  apiKeyId: number,
  accessToken?: string
): Promise<ApiKeyRecord> {
  return requestApiKeys<ApiKeyRecord>("PATCH", `/${apiKeyId}/enable`, undefined, accessToken);
}

export async function deactivateApiKey(
  apiKeyId: number,
  accessToken?: string
): Promise<ApiKeyRecord> {
  return requestApiKeys<ApiKeyRecord>("PATCH", `/${apiKeyId}/disable`, undefined, accessToken);
}

export async function deleteApiKey(
  apiKeyId: number,
  accessToken?: string
): Promise<void> {
  await requestApiKeys<null>("DELETE", `/${apiKeyId}`, undefined, accessToken);
}

export async function fetchModels(): Promise<ModelResponse[]> {
  return requestModels<ModelResponse[]>("GET", "");
}

export async function getModelDetails(modelId: number): Promise<ModelDetailsResponse> {
  return requestModels<ModelDetailsResponse>("GET", `/${modelId}`);
}

export async function fetchModelDocs(modelId: number): Promise<ApiDocumentationResponse[]> {
  const details = await getModelDetails(modelId);
  return details.documentation || [];
}

export async function fetchBillingForModel(modelId: number) {
  return mockRequest(mockBilling.find((b) => b.model_id === modelId) ?? null);
}

export async function getUserBillingInsights(): Promise<UserBillingInsightsResponse> {
  return requestBilling<UserBillingInsightsResponse>("GET", "/insights");
}

export async function getUserUsageInsights(): Promise<UserUsageInsightsResponse> {
  return requestBilling<UserUsageInsightsResponse>("GET", "/usage/insights");
}

export async function getUsageByTask(taskId: string): Promise<UsageRecordResponse[]> {
  return requestBilling<UsageRecordResponse[]>("GET", `/usage/task/${encodeURIComponent(taskId)}`);
}

export async function getUsageSummaryByApiKey(
  apiKeyId: number,
  from: string,
  to: string
): Promise<UsageSummaryResponse> {
  return requestBilling<UsageSummaryResponse>(
    "GET",
    `/usage/apikey/${apiKeyId}/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}

export async function getUsageSummaryByModel(
  apiKeyId: number,
  from: string,
  to: string
): Promise<UsageSummaryResponse> {
  return requestBilling<UsageSummaryResponse>(
    "GET",
    `/usage/apikey/${apiKeyId}/summary/by-model?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}

export async function getUsageHistory(
  apiKeyId: number,
  from: string,
  to: string,
  page = 0,
  size = 20
): Promise<PaginatedResponse<UsageRecordResponse>> {
  return requestBilling<PaginatedResponse<UsageRecordResponse>>(
    "GET",
    `/usage/apikey/${apiKeyId}/history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=${page}&size=${size}`
  );
}

export async function getTotalCost(from: string, to: string): Promise<number> {
  return requestBilling<number>("GET", `/cost/total?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

export async function initiateTopUp(amount: number): Promise<TopUpInitiateResponse> {
  return requestWalletTopUp<TopUpInitiateResponse>("POST", "/initiate", { amount });
}

export async function topUpSuccess(data: string): Promise<{ amount: number; transaction_uuid: string }> {
  return requestWalletTopUp<{ amount: number; transaction_uuid: string }>("GET", `/success?data=${encodeURIComponent(data)}`);
}

export async function topUpFailure(
  data?: string,
  transactionUuid?: string
): Promise<void> {
  const params = new URLSearchParams();
  if (data) params.set("data", data);
  if (transactionUuid) params.set("transaction_uuid", transactionUuid);
  await requestWalletTopUp<null>("GET", `/failure${params.toString() ? `?${params.toString()}` : ""}`);
}

export async function getAdminUserInsights(): Promise<AdminUserInsightsResponse> {
  return requestAdminUsers<AdminUserInsightsResponse>("GET", "/insights");
}

export async function getAdminUserAnalytics(from: string, to: string): Promise<UserAnalyticsResponse> {
  return requestAdminUsers<UserAnalyticsResponse>(
    "GET",
    `/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}

export async function getAdminUserList(params: {
  page?: number;
  size?: number;
  role?: UserRole;
  status?: UserStatus;
}): Promise<PaginatedUserListResponse> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 20));
  if (params.role) query.set("role", params.role);
  if (params.status) query.set("status", params.status);
  return requestAdminUsers<PaginatedUserListResponse>("GET", `/list?${query.toString()}`);
}

export async function updateAdminUserStatus(userId: number, status: UserStatus): Promise<UserProfileResponse> {
  return requestAdminUsers<UserProfileResponse>(
    "PATCH",
    `/${userId}/status?status=${encodeURIComponent(status)}`
  );
}

export async function getAdminBillingInsights(): Promise<BillingInsightsResponse> {
  return requestAdminBilling<BillingInsightsResponse>("GET", "/insights");
}

export async function listBillingConfigs(): Promise<BillingConfigResponse[]> {
  return requestAdminBilling<BillingConfigResponse[]>("GET", "/configs");
}

export async function getBillingConfigById(billingId: number): Promise<BillingConfigResponse> {
  return requestAdminBilling<BillingConfigResponse>("GET", `/configs/${billingId}`);
}

export async function getBillingConfigByModel(modelId: number): Promise<BillingConfigResponse> {
  return requestAdminBilling<BillingConfigResponse>("GET", `/configs/model/${modelId}`);
}

export async function createBillingConfig(body: BillingConfigCreateBody): Promise<BillingConfigResponse> {
  return requestAdminBilling<BillingConfigResponse>("POST", "/configs", body);
}

export async function updateBillingConfig(
  billingId: number,
  body: BillingConfigUpdateBody
): Promise<BillingConfigResponse> {
  return requestAdminBilling<BillingConfigResponse>("PUT", `/configs/${billingId}`, body);
}

export async function deleteBillingConfig(billingId: number): Promise<void> {
  await requestAdminBilling<null>("DELETE", `/configs/${billingId}`);
}

export async function recordUsage(body: RecordUsageBody): Promise<UsageRecordResponse> {
  return requestAdminBilling<UsageRecordResponse>("POST", "/usage", body);
}

export async function getAdminUsageByTask(taskId: string): Promise<UsageRecordResponse[]> {
  return requestAdminBilling<UsageRecordResponse[]>("GET", `/usage/task/${encodeURIComponent(taskId)}`);
}

export async function getAdminUsageSummaryByApiKey(
  apiKeyId: number,
  from: string,
  to: string
): Promise<UsageSummaryResponse> {
  return requestAdminBilling<UsageSummaryResponse>(
    "GET",
    `/usage/apikey/${apiKeyId}/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}

export async function getAdminUsageSummaryByModel(
  apiKeyId: number,
  from: string,
  to: string
): Promise<UsageSummaryResponse> {
  return requestAdminBilling<UsageSummaryResponse>(
    "GET",
    `/usage/apikey/${apiKeyId}/summary/by-model?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}

export async function listDocumentationByModel(modelId: number): Promise<DocumentationResponse[]> {
  return requestAdminDocumentation<DocumentationResponse[]>("GET", `/models/${modelId}`);
}

export async function createDocumentation(
  modelId: number,
  body: DocumentationCreateBody
): Promise<DocumentationResponse> {
  return requestAdminDocumentation<DocumentationResponse>("POST", `/models/${modelId}`, body);
}

export async function updateDocumentation(
  docId: number,
  body: DocumentationUpdateBody
): Promise<DocumentationResponse> {
  return requestAdminDocumentation<DocumentationResponse>("PUT", `/${docId}`, body);
}

export async function deleteDocumentation(docId: number): Promise<void> {
  await requestAdminDocumentation<null>("DELETE", `/${docId}`);
}

// Provider endpoints (user-facing)
export async function fetchProviders(): Promise<ProviderResponse[]> {
  return requestProviders<ProviderResponse[]>("GET", "");
}

export async function getActiveProviders(): Promise<ProviderResponse[]> {
  return requestProviders<ProviderResponse[]>("GET", "/active");
}

export async function getProviderById(providerId: number): Promise<ProviderResponse> {
  return requestProviders<ProviderResponse>("GET", `/${providerId}`);
}

export async function getProviderByName(providerName: string): Promise<ProviderResponse> {
  const encoded = encodeURIComponent(providerName);
  return requestProviders<ProviderResponse>("GET", `/name/${encoded}`);
}

// Admin Model endpoints
export async function getModelInsights(): Promise<ModelInsights> {
  return requestAdminModels<ModelInsights>("GET", "/insights");
}

export async function createModel(body: ModelCreateBody): Promise<ModelResponse> {
  return requestAdminModels<ModelResponse>("POST", "", body);
}

export async function getAllModels(): Promise<ModelResponse[]> {
  return requestAdminModels<ModelResponse[]>("GET", "");
}

export async function getModelsByStatus(status: ModelStatus): Promise<ModelResponse[]> {
  return requestAdminModels<ModelResponse[]>("GET", `/status/${status}`);
}

export async function getAdminModelDetails(modelId: number): Promise<ModelResponse> {
  return requestAdminModels<ModelResponse>("GET", `/${modelId}`);
}

export async function getAdminModelControlDetails(modelId: number): Promise<ModelControlDetailsResponse> {
  return requestAdminModels<ModelControlDetailsResponse>("GET", `/${modelId}/control-details`);
}

export async function updateModel(modelId: number, body: ModelUpdateBody): Promise<ModelResponse> {
  return requestAdminModels<ModelResponse>("PUT", `/${modelId}`, body);
}

export async function updateModelStatus(modelId: number, body: ModelStatusUpdateBody): Promise<ModelResponse> {
  return requestAdminModels<ModelResponse>("PATCH", `/${modelId}/status`, body);
}

export async function deleteModel(modelId: number): Promise<void> {
  await requestAdminModels<null>("DELETE", `/${modelId}`);
}

export async function archiveModel(modelId: number): Promise<void> {
  await requestAdminModels<null>("POST", `/${modelId}/archive`);
}

export async function inactivateModel(modelId: number): Promise<ModelResponse> {
  return requestAdminModels<ModelResponse>("POST", `/${modelId}/inactivate`);
}

export async function getModelAuditHistory(modelId: number): Promise<ModelStatusAudit[]> {
  return requestAdminModels<ModelStatusAudit[]>("GET", `/${modelId}/audit-history`);
}

// Admin Provider endpoints
export async function createProvider(body: ProviderCreateBody): Promise<ProviderResponse> {
  return requestProviders<ProviderResponse>("POST", "", body, undefined, true);
}

export async function updateProvider(providerId: number, body: ProviderUpdateBody): Promise<ProviderResponse> {
  return requestProviders<ProviderResponse>("PUT", `/${providerId}`, body, undefined, true);
}

export async function changeProviderStatus(providerId: number, status: ProviderStatus): Promise<ProviderResponse> {
  return requestProviders<ProviderResponse>("PATCH", `/${providerId}/status?status=${status}`, undefined, undefined, true);
}

export async function deleteProvider(providerId: number): Promise<void> {
  await requestProviders<null>("DELETE", `/${providerId}`, undefined, undefined, true);
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
