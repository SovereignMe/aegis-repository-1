/* global fetch, FormData, Blob, console, process */
import assert from 'node:assert/strict';
import { bootstrapAndLogin, createConcurrencyRunner } from './lib.mjs';

const baseUrl = process.env.LOAD_BASE_URL || 'http://127.0.0.1:4000';
const concurrency = Number(process.env.UPLOAD_LOAD_CONCURRENCY || 4);
const iterations = Number(process.env.UPLOAD_LOAD_ITERATIONS || 12);

async function main() {
  const token = await bootstrapAndLogin(baseUrl, { email: 'upload-admin@example.com', fullName: 'Upload Test Admin', password: 'TempAdminPass!2026' });

  const run = createConcurrencyRunner({
    baseUrl,
    concurrency,
    iterations,
    taskFactory: async ({ index }) => {
      const form = new FormData();
      form.set('title', `Upload ${index}`);
      form.set('docType', 'correspondence');
      form.set('jurisdiction', 'ADMINISTRATIVE');
      form.set('status', 'pending');
      form.set('file', new Blob([`upload-content-${index}`], { type: 'text/plain' }), `upload-${index}.txt`);

      const response = await fetch(`${baseUrl}/documents/upload`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: form,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.document?.id) throw new Error(`upload load request failed: ${response.status}`);
    },
  });
  const result = await run();
  assert.equal(result.failures.length, 0, `Upload load test had failures: ${JSON.stringify(result.failures.slice(0, 5))}`);
  console.log(JSON.stringify({ type: 'upload-load', concurrency, iterations, ...result }, null, 2));
}

await main();
