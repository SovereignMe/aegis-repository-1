import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/services/inMemoryStore.js';
import { getProductionReadinessReport } from '../src/services/production-readiness.service.js';

test('production readiness report exposes structured checks', async () => {
  await db.resetForTests();
  const report = getProductionReadinessReport();
  assert.ok(Array.isArray(report.checks));
  assert.ok(report.checks.some((item) => item.key === 'self-registration'));
  assert.ok(report.summary.passed >= 1);
});
