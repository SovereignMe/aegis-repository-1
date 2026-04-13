import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { env } from '../src/config/env.js';
import { db } from '../src/services/inMemoryStore.js';
import { authService } from '../src/services/auth.service.js';
import { encode } from '../src/modules/auth/crypto-helpers.js';
import { setupApp, bootstrapAdmin, login, createMultipartPayload } from './integration.helpers.js';

test('failure modes: tampered viewer token cannot be used to escalate privileges', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  await bootstrapAdmin(app);
  db.users.push(authService.createUser({
    email: 'viewer@example.com',
    fullName: 'Viewer User',
    role: 'VIEWER',
    password: 'ViewerPass!2026',
    passwordChangeRequired: false,
  }));
  await db.persist('test-viewer-seed');

  const viewerLogin = await login(app, 'viewer@example.com', 'ViewerPass!2026');
  assert.equal(viewerLogin.response.statusCode, 200);

  const [keyId, encoded, signature] = String(viewerLogin.body.token).split('.');
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  payload.role = 'ADMIN';
  const tampered = `${keyId}.${encode(JSON.stringify(payload))}.${signature}`;

  const response = await app.inject({
    method: 'GET',
    url: '/controls/permissions',
    headers: { authorization: `Bearer ${tampered}` },
  });
  assert.equal(response.statusCode, 401);
  assert.doesNotMatch(response.body, /TypeError|stack|Cannot read/i);
});

test('failure modes: trust boundary isolation prevents cross-trust document visibility', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  const bootstrap = await bootstrapAdmin(app);
  const adminToken = bootstrap.body.token;

  const created = await app.inject({
    method: 'POST',
    url: '/documents',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { title: 'Trust A Administrative Record', docType: 'correspondence', jurisdiction: 'PRIVATE' },
  });
  assert.equal(created.statusCode, 200);
  const document = created.json();

  const otherTrustUser = authService.createUser({
    email: 'othertrust@example.com',
    fullName: 'Other Trust User',
    role: 'EDITOR',
    password: 'OtherTrustPass!2026',
    passwordChangeRequired: false,
    trustIds: ['other-trust'],
    activeTrustId: 'other-trust',
  });
  db.users.push(otherTrustUser);
  await db.persist('seed-other-trust-user');

  const otherLogin = await login(app, 'othertrust@example.com', 'OtherTrustPass!2026');
  assert.equal(otherLogin.response.statusCode, 200);
  const otherToken = otherLogin.body.token;

  const listResponse = await app.inject({ method: 'GET', url: '/documents', headers: { authorization: `Bearer ${otherToken}` } });
  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.json().some((item: any) => item.id === document.id), false);

  const verification = await app.inject({ method: 'GET', url: `/documents/${document.id}/verification`, headers: { authorization: `Bearer ${otherToken}` } });
  assert.equal(verification.statusCode, 404);
});

test('failure modes: malformed uploads and large-file abuse attempts are rejected safely', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  const bootstrap = await bootstrapAdmin(app);
  const token = bootstrap.body.token;

  const badExtension = createMultipartPayload(
    { title: 'Executable Payload', docType: 'correspondence', jurisdiction: 'ADMINISTRATIVE' },
    { filename: 'payload.exe', contentType: 'text/plain', content: 'not allowed' },
  );
  const badExtensionResponse = await app.inject({
    method: 'POST',
    url: '/documents/upload',
    headers: { authorization: `Bearer ${token}`, 'content-type': badExtension.contentType },
    payload: badExtension.payload,
  });
  assert.equal(badExtensionResponse.statusCode, 400);
  assert.match(badExtensionResponse.json().message, /extension|allowed/i);
  assert.doesNotMatch(badExtensionResponse.body, /TypeError|stack|Cannot read/i);

  const oversizedContent = Buffer.alloc(env.uploadMaxBytes + 1, 0x61);
  const oversized = createMultipartPayload(
    { title: 'Oversized Payload', docType: 'correspondence', jurisdiction: 'ADMINISTRATIVE' },
    { filename: 'too-large.txt', contentType: 'text/plain', content: oversizedContent },
  );
  const oversizedResponse = await app.inject({
    method: 'POST',
    url: '/documents/upload',
    headers: { authorization: `Bearer ${token}`, 'content-type': oversized.contentType },
    payload: oversized.payload,
  });
  assert.equal([400, 413].includes(oversizedResponse.statusCode), true);
  assert.match(oversizedResponse.json().message, /size limit|exceeds|upload|too large/i);
  assert.doesNotMatch(oversizedResponse.body, /TypeError|stack|Cannot read/i);
});

test('failure modes: concurrent updates converge to a single immutable timer state', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  const bootstrap = await bootstrapAdmin(app);
  const token = bootstrap.body.token;

  const start = await app.inject({
    method: 'POST',
    url: '/timers',
    headers: { authorization: `Bearer ${token}` },
    payload: { label: 'Concurrent stop timer', timerType: 'count-up' },
  });
  assert.equal(start.statusCode, 200);
  const timer = start.json();

  const [stopA, stopB] = await Promise.all([
    app.inject({ method: 'PATCH', url: `/timers/${timer.id}/stop`, headers: { authorization: `Bearer ${token}` } }),
    app.inject({ method: 'PATCH', url: `/timers/${timer.id}/stop`, headers: { authorization: `Bearer ${token}` } }),
  ]);

  assert.equal([200, 404].includes(stopA.statusCode), true);
  assert.equal([200, 404].includes(stopB.statusCode), true);
  const successful = [stopA, stopB].find((response) => response.statusCode === 200);
  assert.ok(successful);
  const bodyA = successful.json();
  assert.ok(bodyA.stoppedAt);

  const stored = db.timers.find((item) => item.id === timer.id);
  assert.ok(stored);
  assert.ok(stored?.stoppedAt);
  assert.equal(stored?.immutable, true);
  assert.equal(stored?.deletedAt || null, null);
  assert.equal(stored?.durationSeconds >= 0, true);
});

test('failure modes: evidence artifact tampering is surfaced by verification checks', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  const bootstrap = await bootstrapAdmin(app);
  const token = bootstrap.body.token;

  const upload = createMultipartPayload(
    { title: 'Tamper Check Document', docType: 'correspondence', jurisdiction: 'ADMINISTRATIVE' },
    { filename: 'tamper-check.txt', contentType: 'text/plain', content: 'original evidentiary content' },
  );
  const response = await app.inject({
    method: 'POST',
    url: '/documents/upload',
    headers: { authorization: `Bearer ${token}`, 'content-type': upload.contentType },
    payload: upload.payload,
  });
  assert.equal(response.statusCode, 200);
  const document = response.json();

  await fs.writeFile(document.storagePath, 'tampered evidentiary content', 'utf8');

  const verification = await app.inject({
    method: 'GET',
    url: `/documents/${document.id}/verification`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(verification.statusCode, 200);
  const body = verification.json();
  assert.equal(body.checksumMatches, false);
  assert.ok(body.recordedChecksum);
  assert.ok(body.currentChecksum);
});

test('failure modes: governing-instrument lock prevents a second controlling instrument', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  const bootstrap = await bootstrapAdmin(app);
  const token = bootstrap.body.token;

  const second = await app.inject({
    method: 'POST',
    url: '/documents',
    headers: { authorization: `Bearer ${token}` },
    payload: { title: 'Shadow Governing Instrument', docType: 'governing', governingLevel: 'controlling', jurisdiction: 'PRIVATE' },
  });
  assert.equal(second.statusCode, 400);
  assert.match(second.json().message, /governing hierarchy lock|controlling governing instrument/i);
});
