import { apiClient, clearAuthToken } from "./apiClient";

type ApiResult = any;

export type BootstrapStatus = {
  ok: boolean;
  isAuthenticated: boolean;
  needsBootstrap?: boolean;
  user: any | null;
  data: any | null;
  error: any | null;
};

let refreshPromise: Promise<ApiResult> | null = null;

function getStatus(error: any): number | null {
  return error?.status ?? error?.statusCode ?? null;
}

function isUnauthorized(error: any): boolean {
  return getStatus(error) === 401;
}

export async function login(email: string, password: string): Promise<ApiResult> {
  return apiClient.post("/auth/login", { email, password });
}

export async function logout(): Promise<ApiResult> {
  try {
    return await apiClient.post("/auth/logout");
  } finally {
    clearAuthToken();
  }
}

export async function getCurrentUser(): Promise<ApiResult> {
  return apiClient.get("/auth/me");
}

export async function refreshAccessToken(): Promise<ApiResult> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = apiClient.post("/auth/refresh").finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function refresh(): Promise<ApiResult> {
  return refreshAccessToken();
}

export async function bootstrapAdmin(payload: Record<string, unknown>): Promise<ApiResult> {
  return apiClient.post("/auth/bootstrap-admin", payload);
}

export async function verifyMfaChallenge(challengeToken: string, code: string): Promise<ApiResult> {
  return apiClient.post("/auth/mfa/verify-challenge", { challengeToken, code });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<ApiResult> {
  return apiClient.post("/auth/change-password", { currentPassword, newPassword });
}

export async function beginMfaSetup(): Promise<ApiResult> {
  return apiClient.post("/auth/mfa/setup");
}

export async function enableMfa(code: string): Promise<ApiResult> {
  return apiClient.post("/auth/mfa/enable", { code });
}

export async function listUsers(): Promise<ApiResult> {
  return apiClient.get("/auth/users");
}

export async function createUser(payload: Record<string, unknown>): Promise<ApiResult> {
  return apiClient.post("/auth/users", payload);
}

export async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (!isUnauthorized(error)) throw error;
    await refreshAccessToken();
    return fn();
  }
}

export async function getBootstrapStatus(): Promise<BootstrapStatus> {
  const bootstrap = await apiClient.get<{ needsBootstrap?: boolean; userCount?: number }>("/auth/bootstrap-status");
  if (bootstrap?.needsBootstrap) {
    return {
      ok: true,
      isAuthenticated: false,
      needsBootstrap: true,
      user: null,
      data: bootstrap,
      error: null,
    };
  }

  try {
    const current = await getCurrentUser();
    return {
      ok: true,
      isAuthenticated: true,
      needsBootstrap: false,
      user: current?.user ?? null,
      data: current,
      error: null,
    };
  } catch (meError: any) {
    if (!isUnauthorized(meError)) {
      return {
        ok: false,
        isAuthenticated: false,
        needsBootstrap: false,
        user: null,
        data: null,
        error: meError,
      };
    }

    try {
      await refreshAccessToken();
      const current = await getCurrentUser();
      return {
        ok: true,
        isAuthenticated: true,
        needsBootstrap: false,
        user: current?.user ?? null,
        data: current,
        error: null,
      };
    } catch (refreshError: any) {
      if (isUnauthorized(refreshError)) {
        return {
          ok: true,
          isAuthenticated: false,
          needsBootstrap: false,
          user: null,
          data: null,
          error: null,
        };
      }
      return {
        ok: false,
        isAuthenticated: false,
        needsBootstrap: false,
        user: null,
        data: null,
        error: refreshError,
      };
    }
  }
}

export const authService = {
  login,
  logout,
  getCurrentUser,
  refreshAccessToken,
  refresh,
  withAuthRetry,
  getBootstrapStatus,
  bootstrapAdmin,
  verifyMfaChallenge,
  changePassword,
  beginMfaSetup,
  enableMfa,
  listUsers,
  createUser,
};

export default authService;
