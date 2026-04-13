/* global fetch, performance */
import { setTimeout as delay } from 'node:timers/promises';

export function createConcurrencyRunner({ baseUrl, concurrency, iterations, taskFactory }) {
  return async function run() {
    const results = [];
    let index = 0;
    async function worker() {
      while (index < iterations) {
        const current = index++;
        const started = performance.now();
        try {
          await taskFactory({ baseUrl, index: current });
          results.push({ ok: true, durationMs: performance.now() - started });
        } catch (error) {
          results.push({ ok: false, durationMs: performance.now() - started, error: error instanceof Error ? error.message : String(error) });
        }
        await delay(5);
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    const failures = results.filter((entry) => !entry.ok);
    const maxMs = Math.max(...results.map((entry) => entry.durationMs), 0);
    const avgMs = results.reduce((sum, entry) => sum + entry.durationMs, 0) / (results.length || 1);
    return { count: results.length, failures, maxMs, avgMs };
  };
}

export async function bootstrapAndLogin(baseUrl, creds = { email: 'admin@example.com', fullName: 'Administrative Trustee', password: 'TempAdminPass!2026' }) {
  await fetch(`${baseUrl}/auth/bootstrap-admin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(creds),
  });
  const login = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });
  const payload = await login.json();
  if (!login.ok || !payload?.token) {
    throw new Error(`Unable to establish session for load test: ${JSON.stringify(payload)}`);
  }
  return payload.token;
}
