import test from 'node:test';
import assert from 'node:assert/strict';
import { governanceService } from '../src/services/governance.service.js';
import { db } from '../src/services/inMemoryStore.js';

const requesterCtx = { user: { id: '1', email: 'admin@example.com', fullName: 'Admin', role: 'ADMIN', mustChangePassword: false } } as const;
const approverCtx = { user: { id: '2', email: 'approver@example.com', fullName: 'Approver', role: 'ADMIN', mustChangePassword: false } } as const;

test('GovernanceService approves distributions and creates accounting entries', async () => {
  db.beneficiaries = [
    { id: 'bene-test', trustId: 'local-trust', beneficiaryCode: 'BEN-TEST', fullName: 'Test Beneficiary', beneficiaryType: 'individual', status: 'active', allocationPercent: 100, notes: '', immutable: false, deletedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];
  db.distributions = [];
  db.accountingEntries = [];

  db.approvals = [];

  const requested = await governanceService.requestDistribution(requesterCtx as any, {
    beneficiaryId: 'bene-test',
    amount: 150,
    notes: 'Beneficiary support request for current educational disbursement.',
    reasonCode: 'BENEFICIARY_SUPPORT',
  });
  const approved = await governanceService.approveDistribution(approverCtx as any, requested.id, {
    notes: 'Independent approval after distribution review.',
    reasonCode: 'BENEFICIARY_SUPPORT',
  });

  assert.equal(approved.distribution.status, 'approved');
  assert.equal(approved.accountingEntry.amount, 150);
  assert.equal(db.accountingEntries.length > 0, true);
});
