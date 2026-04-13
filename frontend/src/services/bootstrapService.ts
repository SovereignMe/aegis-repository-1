import * as authService from "./authService";

type BootstrapResult = {
  user: any | null;
  isAuthenticated: boolean;
};

let bootstrapPromise: Promise<BootstrapResult> | null = null;

export async function safeRequest<T>(request: () => Promise<T>): Promise<{
  ok: boolean;
  data: T | null;
  error: any | null;
}>;
export async function safeRequest<T>(request: () => Promise<T>, fallback: T): Promise<T>;
export async function safeRequest<T>(request: () => Promise<T>, fallback?: T): Promise<any> {
  try {
    const data = await request();
    if (arguments.length >= 2) {
      return data;
    }
    return {
      ok: true,
      data,
      error: null,
    };
  } catch (error: any) {
    if (import.meta.env.DEV) {
      console.error("safeRequest error:", error);
    }

    if (arguments.length >= 2) {
      return fallback as T;
    }

    return {
      ok: false,
      data: null,
      error,
    };
  }
}

export async function bootstrapApp(): Promise<BootstrapResult> {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    const status = await authService.getBootstrapStatus();
    return {
      user: status.user,
      isAuthenticated: status.isAuthenticated,
    };
  })();

  try {
    return await bootstrapPromise;
  } finally {
    bootstrapPromise = null;
  }
}

export async function initializeApp(
  setState: (state: { user: any | null; isAuthenticated: boolean; isLoading: boolean }) => void,
): Promise<void> {
  const result = await bootstrapApp();

  setState({
    user: result.user,
    isAuthenticated: result.isAuthenticated,
    isLoading: false,
  });
}

export const bootstrapService = {
  safeRequest,
  bootstrapApp,
  initializeApp,
};

export default bootstrapService;
