/* global fetch, console, process */
import assert from 'node:assert/strict';
import { createConcurrencyRunner } from './lib.mjs';

const baseUrl = process.env.LOAD_BASE_URL || 'http://127.0.0.1:4000';
const concurrency = Number(process.env.AUTH_LOAD_CONCURRENCY || 6);
const iterations = Number(process.env.AUTH_LOAD_ITERATIONS || 24);

async function main() {
  const creds = { email: 'load-admin@example.com', fullName: 'Load Test Admin', password: 'TempAdminPass!2026' };
  await fetch(`${baseUrl}/auth/bootstrap-admin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(creds),
  });

  const run = createConcurrencyRunner({
    baseUrl,
    concurrency,
    iterations,
    taskFactory: async () => {
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: creds.email, password: creds.password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.token) throw new Error(`auth load request failed: ${response.status}`);
    },
  });
  const result = await run();
  assert.equal(result.failures.length, 0, `Auth load test had failures: ${JSON.stringify(result.failures.slice(0, 5))}`);
  console.log(JSON.stringify({ type: 'auth-load', concurrency, iterations, ...result }, null, 2));
}

await main();
