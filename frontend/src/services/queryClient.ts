export type QueryListener = () => void;
export type QueryFactory<T> = (signal: AbortSignal) => Promise<T>;

export interface QueryFetchOptions {
  cacheTimeMs?: number;
  staleTimeMs?: number;
  backgroundRefetch?: boolean;
  retry?: number;
  retryDelayMs?: number;
  force?: boolean;
}

export interface QueryInvalidationDiagnostic {
  key: string;
  at: number;
  reason: string;
}

export interface QueryMutationState {
  status: "idle" | "pending" | "success" | "error";
  startedAt?: number;
  finishedAt?: number;
  error?: string | null;
}

interface CacheEntry<T = unknown> {
  data?: T;
  updatedAt?: number;
  promise?: Promise<T>;
  abortController?: AbortController;
  error?: unknown;
  expiresAt?: number;
  staleAt?: number;
  backgroundPromise?: Promise<T>;
}

const listeners = new Map<string, Set<QueryListener>>();
const cache = new Map<string, CacheEntry>();
const mutationStates = new Map<string, QueryMutationState>();
const invalidationDiagnostics: QueryInvalidationDiagnostic[] = [];

function emit(key: string): void {
  for (const listener of listeners.get(key) || []) listener();
}

function defaultRetryDelay(attempt: number, baseDelayMs = 300): number {
  return Math.min(baseDelayMs * (2 ** Math.max(0, attempt - 1)), 5000);
}

async function withRetry<T>(factory: QueryFactory<T>, signal: AbortSignal, retry: number, retryDelayMs: number): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= retry) {
    attempt += 1;
    try {
      if (signal.aborted) throw new DOMException("Query aborted", "AbortError");
      return await factory(signal);
    } catch (error) {
      lastError = error;
      if (signal.aborted || attempt > retry) break;
      await new Promise((resolve) => setTimeout(resolve, defaultRetryDelay(attempt, retryDelayMs)));
    }
  }
  throw lastError;
}

export const queryClient = {
  getQueryData<T>(key: string): T | undefined {
    return cache.get(key)?.data as T | undefined;
  },
  getQueryMeta(key: string): CacheEntry | undefined {
    return cache.get(key);
  },
  getMutationState(key: string): QueryMutationState {
    return mutationStates.get(key) || { status: "idle", error: null };
  },
  setMutationState(key: string, state: QueryMutationState): void {
    mutationStates.set(key, state);
    emit(`mutation:${key}`);
  },
  async runMutation<T>(key: string, action: () => Promise<T>): Promise<T> {
    const startedAt = Date.now();
    this.setMutationState(key, { status: "pending", startedAt, error: null });
    try {
      const result = await action();
      this.setMutationState(key, { status: "success", startedAt, finishedAt: Date.now(), error: null });
      return result;
    } catch (error) {
      this.setMutationState(key, { status: "error", startedAt, finishedAt: Date.now(), error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },
  setQueryData<T>(key: string, data: T, options: QueryFetchOptions = {}): T {
    const now = Date.now();
    cache.set(key, {
      data,
      updatedAt: now,
      expiresAt: now + (options.cacheTimeMs ?? 5 * 60_000),
      staleAt: now + (options.staleTimeMs ?? 30_000),
    });
    emit(key);
    return data;
  },
  async fetchQuery<T>(key: string, factory: QueryFactory<T>, options: QueryFetchOptions = {}): Promise<T> {
    const now = Date.now();
    const current = cache.get(key) as CacheEntry<T> | undefined;
    const staleTimeMs = options.staleTimeMs ?? 30_000;
    const cacheTimeMs = options.cacheTimeMs ?? 5 * 60_000;
    const retry = options.retry ?? 1;
    const retryDelayMs = options.retryDelayMs ?? 300;

    if (!options.force && current?.data !== undefined && current.expiresAt && current.expiresAt > now) {
      const isStale = !current.staleAt || current.staleAt <= now;
      if (!isStale) return current.data;
      if (options.backgroundRefetch) {
        if (!current.backgroundPromise) {
          const backgroundAbortController = new AbortController();
          const backgroundPromise = withRetry(factory, backgroundAbortController.signal, retry, retryDelayMs)
            .then((data) => {
              cache.set(key, {
                data,
                updatedAt: Date.now(),
                expiresAt: Date.now() + cacheTimeMs,
                staleAt: Date.now() + staleTimeMs,
              });
              emit(key);
              return data;
            })
            .catch(() => current.data as T)
            .finally(() => {
              const latest = cache.get(key) as CacheEntry<T> | undefined;
              if (latest) cache.set(key, { ...latest, backgroundPromise: undefined, abortController: undefined });
            });
          cache.set(key, { ...current, backgroundPromise, abortController: backgroundAbortController });
        }
        return current.data;
      }
    }

    if (current?.promise) return current.promise;
    current?.abortController?.abort();
    const abortController = new AbortController();
    const promise = withRetry(factory, abortController.signal, retry, retryDelayMs)
      .then((data) => {
        cache.set(key, {
          data,
          updatedAt: Date.now(),
          expiresAt: Date.now() + cacheTimeMs,
          staleAt: Date.now() + staleTimeMs,
        });
        emit(key);
        return data;
      })
      .catch((error) => {
        cache.set(key, {
          data: current?.data,
          updatedAt: current?.updatedAt,
          expiresAt: current?.expiresAt,
          staleAt: current?.staleAt,
          error,
        });
        emit(key);
        throw error;
      })
      .finally(() => {
        const latest = cache.get(key) as CacheEntry<T> | undefined;
        if (latest) cache.set(key, { ...latest, promise: undefined, abortController: undefined });
      });
    cache.set(key, { ...current, promise, abortController, error: undefined });
    return promise;
  },
  invalidateQueries(keys: string[], reason = "manual"): void {
    const at = Date.now();
    for (const key of keys) {
      const current = cache.get(key);
      current?.abortController?.abort();
      cache.delete(key);
      invalidationDiagnostics.unshift({ key, at, reason });
      emit(key);
    }
    invalidationDiagnostics.splice(25);
  },
  subscribe(key: string, listener: QueryListener): () => void {
    const bucket = listeners.get(key) || new Set<QueryListener>();
    bucket.add(listener);
    listeners.set(key, bucket);
    return () => {
      bucket.delete(listener);
      if (!bucket.size) listeners.delete(key);
    };
  },
  getInvalidationDiagnostics(): QueryInvalidationDiagnostic[] {
    return [...invalidationDiagnostics];
  },
  cancelQuery(key: string): void {
    const current = cache.get(key);
    current?.abortController?.abort();
  },
  cancelQueries(keys: string[]): void {
    for (const key of keys) this.cancelQuery(key);
  },
};
