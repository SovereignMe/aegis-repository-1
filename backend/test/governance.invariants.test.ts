import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/services/inMemoryStore.js';

test('every governing document produces exhibit linkage in seeded state', async () => {
  await db.resetForTests();
  const governingDocuments = db.documents.filter((doc) => doc.docType === 'governing' || doc.governingLevel === 'controlling');
  assert.ok(governingDocuments.length > 0);
  for (const document of governingDocuments) {
    const exhibit = db.exhibitIndex.find((entry) => entry.documentId === document.id && entry.trustId === document.trustId);
    assert.ok(exhibit, `missing exhibit linkage for ${document.id}`);
  }
});

test('audit verification fails on tamper', async () => {
  await db.resetForTests();
  db.addAudit('TEST_EVENT', 'system', 'seed', null, { ok: true }, { trustId: db.documents[0]?.trustId || null }, 'SYSTEM');
  const valid = db.verifyAudit();
  assert.equal(valid.valid, true);
  db.audit[0] = { ...db.audit[0], hash: 'tampered-hash' };
  const tampered = db.verifyAudit();
  assert.equal(tampered.valid, false);
});


test('approved distributions reconcile to accounting entries in seeded state', async () => {
  await db.resetForTests();
  const approved = db.distributions.filter((item) => item.status === 'approved');
  for (const distribution of approved) {
    const accounting = db.accountingEntries.find((entry) => entry.distributionId === distribution.id && entry.trustId === distribution.trustId);
    assert.ok(accounting, `missing accounting entry for approved distribution ${distribution.id}`);
  }
});
