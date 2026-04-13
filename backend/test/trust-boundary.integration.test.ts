import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/services/inMemoryStore.js';
import { setupApp, bootstrapAdmin, createManagedUser, login } from './integration.helpers.js';

async function createApprover(app: Awaited<ReturnType<typeof setupApp>>, token: string, email: string, password: string) {
  const managed = await createManagedUser(app, token, {
    email,
    fullName: email,
    role: 'ADMIN',
    password,
  });
  assert.equal(managed.response.statusCode, 200);
  const signedIn = await login(app, email, password);
  assert.equal(signedIn.response.statusCode, 200);
  return signedIn.body.token as string;
}

test('trust boundary hardening: cross-trust distribution approval is rejected even when id is known', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  const bootstrap = await bootstrapAdmin(app);
  const ownerToken = bootstrap.body.token as string;
  const approverToken = await createApprover(app, ownerToken, 'boundary-approver@example.com', 'BoundaryPass!2026');

  const beneficiaryResponse = await app.inject({
    method: 'POST',
    url: '/governance/beneficiaries',
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { fullName: 'Boundary Beneficiary', allocationPercent: 100 },
  });
  assert.equal(beneficiaryResponse.statusCode, 200);
  const beneficiary = beneficiaryResponse.json();

  const distributionResponse = await app.inject({
    method: 'POST',
    url: '/governance/distributions',
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { beneficiaryId: beneficiary.id, amount: 250, notes: 'Boundary test request.', reasonCode: 'BENEFICIARY_SUPPORT' },
  });
  assert.equal(distributionResponse.statusCode, 200);
  const distribution = distributionResponse.json().distribution;

  const target = db.distributions.find((item) => item.id === distribution.id);
  assert.ok(target);
  target!.trustId = 'other-trust';

  const blocked = await app.inject({
    method: 'PATCH',
    url: `/governance/distributions/${distribution.id}/approve`,
    headers: { authorization: `Bearer ${approverToken}` },
    payload: { notes: 'Attempted cross-trust approval.', reasonCode: 'BENEFICIARY_SUPPORT' },
  });
  assert.equal(blocked.statusCode, 403);
  assert.match(blocked.json().message, /trust access denied/i);
});

test('trust boundary hardening: cross-trust notice service is rejected even when id is known', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  const bootstrap = await bootstrapAdmin(app);
  const token = bootstrap.body.token as string;

  const noticeResponse = await app.inject({
    method: 'POST',
    url: '/governance/notices',
    headers: { authorization: `Bearer ${token}` },
    payload: { recipientName: 'Boundary Office', recipientAddress: 'Unknown', notes: 'Boundary notice.' },
  });
  assert.equal(noticeResponse.statusCode, 200);
  const notice = noticeResponse.json();

  const target = db.notices.find((item) => item.id === notice.id);
  assert.ok(target);
  target!.trustId = 'other-trust';

  const blocked = await app.inject({
    method: 'PATCH',
    url: `/governance/notices/${notice.id}/serve`,
    headers: { authorization: `Bearer ${token}` },
    payload: { trackingNumber: 'BOUNDARY-123' },
  });
  assert.equal(blocked.statusCode, 403);
  assert.match(blocked.json().message, /trust access denied/i);
});
