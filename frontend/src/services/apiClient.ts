const importMetaEnv = (typeof import.meta !== "undefined" && (import.meta as any).env) ? (import.meta as any).env : {};

const API_BASE_URL = String(
  importMetaEnv.VITE_API_URL ||
    importMetaEnv.VITE_API_BASE_URL ||
    "http://localhost:3001",
).replace(/\/$/, "");

const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 400;
const AUTH_STORAGE_KEY = "aegis_access_token";

export type ApiClientOptions = RequestInit & {
  timeoutMs?: number;
  skipAuthRetry?: boolean;
};

let authToken = "";

function storageAvailable(): boolean {
  return typeof localStorage !== "undefined" && localStorage !== null;
}

function readStoredToken(): string {
  if (!storageAvailable()) return "";
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function persistToken(token: string) {
  authToken = token || "";
  if (!storageAvailable()) return;
  try {
    if (authToken) localStorage.setItem(AUTH_STORAGE_KEY, authToken);
    else localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}

export function setAuthToken(token: string) {
  persistToken(token);
}

export function getAuthToken(): string {
  return authToken || readStoredToken();
}

export function clearAuthToken() {
  persistToken("");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isRetriableStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

function shouldRetryNetworkError(error: unknown): boolean {
  return !isAbortError(error);
}

async function parseResponsePayload(response: Response): Promise<any> {
  const contentType = response.headers?.get?.("content-type") || "";

  if (contentType.includes("application/json") || typeof response.json === "function") {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  } catch {
    return null;
  }
}

function buildHeaders(options: ApiClientOptions): Record<string, string> {
  const source = options.headers as Record<string, string> | undefined;
  const headers: Record<string, string> = { ...(source || {}) };
  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const token = getAuthToken();

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (hasBody && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

function buildUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function normalizeBody(body: unknown): BodyInit | null | undefined {
  if (body === undefined) return undefined;
  if (body === null) return null;
  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return body as BodyInit;
  }
  return JSON.stringify(body);
}

async function refreshSessionToken(): Promise<string> {
  const payload = await rawRequest("/auth/refresh", { method: "POST", skipAuthRetry: true }, 0);
  const token = String(payload?.token || "");
  if (!token) {
    clearAuthToken();
    throw new Error("Session refresh failed");
  }
  setAuthToken(token);
  return token;
}

async function rawRequest(
  path: string,
  options: ApiClientOptions = {},
  retries: number = MAX_RETRIES,
): Promise<any> {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const url = buildUrl(path);
  const headers = buildHeaders(options);
  const { timeoutMs: _ignoredTimeoutMs, signal: callerSignal, skipAuthRetry, ...fetchOptions } = options;

  let abortListenerCleanup: (() => void) | null = null;

  if (callerSignal) {
    if (callerSignal.aborted) {
      clearTimeout(timeoutId);
      controller.abort();
    } else {
      const onAbort = () => controller.abort();
      callerSignal.addEventListener("abort", onAbort, { once: true });
      abortListenerCleanup = () => callerSignal.removeEventListener("abort", onAbort);
    }
  }

  try {
    const response = await fetch(url, {
      credentials: "include",
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    const payload = await parseResponsePayload(response);

    if (!response.ok) {
      const message = payload?.message || payload?.error || `Request failed with status ${response.status}`;
      const error: any = new Error(message);
      error.status = response.status;
      error.payload = payload;
      error.url = url;
      error.method = fetchOptions.method || "GET";

      if (response.status === 401 && !skipAuthRetry && !String(path).endsWith("/auth/refresh")) {
        try {
          await refreshSessionToken();
          return rawRequest(path, { ...options, skipAuthRetry: true }, retries);
        } catch (refreshError) {
          clearAuthToken();
          throw new Error("Session refresh failed");
        }
      }

      if (retries > 0 && isRetriableStatus(response.status)) {
        await sleep(RETRY_DELAY_MS);
        return rawRequest(path, options, retries - 1);
      }

      throw error;
    }

    if (payload?.token && String(path).startsWith("/auth/")) {
      setAuthToken(String(payload.token));
    }

    return payload;
  } catch (error: any) {
    if (retries > 0 && shouldRetryNetworkError(error)) {
      await sleep(RETRY_DELAY_MS);
      return rawRequest(path, options, retries - 1);
    }

    if (importMetaEnv.DEV) {
      console.error("API Error:", error);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (abortListenerCleanup) abortListenerCleanup();
  }
}

type ApiClientFn = {
  <T = any>(path: string, options?: ApiClientOptions, retries?: number): Promise<T>;
  get<T = any>(path: string, options?: Omit<ApiClientOptions, "method" | "body">): Promise<T>;
  delete<T = any>(path: string, options?: Omit<ApiClientOptions, "method" | "body">): Promise<T>;
  post<T = any>(path: string, body?: unknown, options?: Omit<ApiClientOptions, "method" | "body">): Promise<T>;
  put<T = any>(path: string, body?: unknown, options?: Omit<ApiClientOptions, "method" | "body">): Promise<T>;
  patch<T = any>(path: string, body?: unknown, options?: Omit<ApiClientOptions, "method" | "body">): Promise<T>;
};

const apiClientImpl = (async (path: string, options: ApiClientOptions = {}, retries: number = MAX_RETRIES) =>
  rawRequest(path, options, retries)) as ApiClientFn;

apiClientImpl.get = function <T = any>(path: string, options: Omit<ApiClientOptions, "method" | "body"> = {}) {
  return rawRequest(path, { ...options, method: "GET" }) as Promise<T>;
};
apiClientImpl.delete = function <T = any>(path: string, options: Omit<ApiClientOptions, "method" | "body"> = {}) {
  return rawRequest(path, { ...options, method: "DELETE" }) as Promise<T>;
};
apiClientImpl.post = function <T = any>(path: string, body?: unknown, options: Omit<ApiClientOptions, "method" | "body"> = {}) {
  return rawRequest(path, { ...options, method: "POST", body: normalizeBody(body) }) as Promise<T>;
};
apiClientImpl.put = function <T = any>(path: string, body?: unknown, options: Omit<ApiClientOptions, "method" | "body"> = {}) {
  return rawRequest(path, { ...options, method: "PUT", body: normalizeBody(body) }) as Promise<T>;
};
apiClientImpl.patch = function <T = any>(path: string, body?: unknown, options: Omit<ApiClientOptions, "method" | "body"> = {}) {
  return rawRequest(path, { ...options, method: "PATCH", body: normalizeBody(body) }) as Promise<T>;
};

authToken = readStoredToken();

export const apiClient = apiClientImpl;
export const apiFetch = apiClientImpl;
export { API_BASE_URL };
export default apiClientImpl;
