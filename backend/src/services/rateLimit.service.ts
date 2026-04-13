import { env } from "../config/env.js";

interface RateBucket {
  count: number;
  resetAt: number;
}

interface LoginBucket {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil: number;
}

class RateLimitService {
  private readonly requestBuckets = new Map<string, RateBucket>();
  private readonly loginBuckets = new Map<string, LoginBucket>();

  consumeRequest(key: string) {
    const now = Date.now();
    const bucket = this.requestBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.requestBuckets.set(key, { count: 1, resetAt: now + env.rateLimitWindowMs });
      return { allowed: true, remaining: env.maxRequestsPerWindow - 1 };
    }
    if (bucket.count >= env.maxRequestsPerWindow) {
      return { allowed: false, retryAfterMs: bucket.resetAt - now };
    }
    bucket.count += 1;
    return { allowed: true, remaining: env.maxRequestsPerWindow - bucket.count };
  }

  checkLogin(key: string) {
    const now = Date.now();
    const bucket = this.loginBuckets.get(key);
    if (!bucket) return { allowed: true };
    if (bucket.blockedUntil > now) return { allowed: false, retryAfterMs: bucket.blockedUntil - now };
    if (now - bucket.firstAttemptAt > env.loginWindowMs) {
      this.loginBuckets.delete(key);
      return { allowed: true };
    }
    return { allowed: true };
  }

  recordLoginFailure(key: string) {
    const now = Date.now();
    const existing = this.loginBuckets.get(key);
    if (!existing || now - existing.firstAttemptAt > env.loginWindowMs) {
      this.loginBuckets.set(key, { attempts: 1, firstAttemptAt: now, blockedUntil: 0 });
      return;
    }
    existing.attempts += 1;
    if (existing.attempts >= env.loginMaxAttempts) {
      existing.blockedUntil = now + env.loginBlockMs;
    }
  }

  clearLoginFailures(key: string) {
    this.loginBuckets.delete(key);
  }
}

export const rateLimitService = new RateLimitService();
