import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/config/env.js';
import { db } from '../src/services/inMemoryStore.js';
import { setupApp, login } from './integration.helpers.js';

function snapshotEnv() {
  return {
    nodeEnv: env.nodeEnv,
    isProduction: env.isProduction,
    bootstrapApiKey: env.bootstrapApiKey,
    trustProxy: env.trustProxy,
    trustedProxyCidrs: [...env.trustedProxyCidrs],
  };
}

function restoreEnv(snapshot: ReturnType<typeof snapshotEnv>) {
  env.nodeEnv = snapshot.nodeEnv;
  env.isProduction = snapshot.isProduction;
  env.bootstrapApiKey = snapshot.bootstrapApiKey;
  env.trustProxy = snapshot.trustProxy;
  env.trustedProxyCidrs = snapshot.trustedProxyCidrs;
}

test('auth security regression: bootstrap admin requires valid bootstrap key outside development', async (t) => {
  const snapshot = snapshotEnv();
  env.nodeEnv = 'production';
  env.isProduction = true;
  env.bootstrapApiKey = 'expected-bootstrap-secret';

  const app = await setupApp();
  t.after(async () => {
    restoreEnv(snapshot);
    await app.close();
  });

  const payload = { email: 'admin@example.com', fullName: 'Administrative Trustee', password: 'TempAdminPass!2026' };

  const missing = await app.inject({ method: 'POST', url: '/auth/bootstrap-admin', payload });
  assert.equal(missing.statusCode, 401);
  assert.match(missing.json().message, /required outside development/i);

  const invalid = await app.inject({ method: 'POST', url: '/auth/bootstrap-admin', headers: { 'x-bootstrap-api-key': 'wrong-secret' }, payload });
  assert.equal(invalid.statusCode, 403);
  assert.match(invalid.json().message, /invalid/i);

  const valid = await app.inject({ method: 'POST', url: '/auth/bootstrap-admin', headers: { 'x-bootstrap-api-key': 'expected-bootstrap-secret' }, payload });
  assert.equal(valid.statusCode, 200);
  assert.equal(valid.json().bootstrapComplete, true);
});

test('auth security regression: proxy-aware client IP is used for bootstrap, login, refresh, and password change', async (t) => {
  const snapshot = snapshotEnv();
  env.nodeEnv = 'development';
  env.isProduction = false;
  env.trustProxy = true;
  env.trustedProxyCidrs = ['loopback'];

  const app = await setupApp();
  t.after(async () => {
    restoreEnv(snapshot);
    await app.close();
  });

  const forwardedIp = '203.0.113.45';
  const bootstrap = await app.inject({
    method: 'POST',
    url: '/auth/bootstrap-admin',
    remoteAddress: '127.0.0.1',
    headers: {
      'x-forwarded-for': `${forwardedIp}, 127.0.0.1`,
      'user-agent': 'proxy-bootstrap-agent',
    },
    payload: { email: 'admin@example.com', fullName: 'Administrative Trustee', password: 'TempAdminPass!2026' },
  });
  assert.equal(bootstrap.statusCode, 200);
  assert.equal(db.users[0]?.lastLoginIp, forwardedIp);
  assert.equal(db.sessions[0]?.createdByIp, forwardedIp);
  assert.equal(db.sessions[0]?.lastUsedIp, forwardedIp);

  const loggedIn = await app.inject({
    method: 'POST',
    url: '/auth/login',
    remoteAddress: '127.0.0.1',
    headers: {
      'x-forwarded-for': `${forwardedIp}, 127.0.0.1`,
      'user-agent': 'proxy-login-agent',
    },
    payload: { email: 'admin@example.com', password: 'TempAdminPass!2026' },
  });
  assert.equal(loggedIn.statusCode, 200);
  const latestSession = db.sessions.at(-1);
  assert.equal(db.users[0]?.lastLoginIp, forwardedIp);
  assert.equal(latestSession?.createdByIp, forwardedIp);

  const refreshCookie = loggedIn.cookies.find((cookie: any) => cookie.name === env.refreshCookieName)?.value;
  assert.ok(refreshCookie);
  const refreshed = await app.inject({
    method: 'POST',
    url: '/auth/refresh',
    remoteAddress: '127.0.0.1',
    headers: {
      cookie: `${env.refreshCookieName}=${encodeURIComponent(refreshCookie)}`,
      'x-forwarded-for': `${forwardedIp}, 127.0.0.1`,
      'user-agent': 'proxy-refresh-agent',
    },
  });
  assert.equal(refreshed.statusCode, 200);
  const refreshedSessionId = refreshed.json().session.id;
  const refreshedSession = db.sessions.find((session) => session.id === refreshedSessionId);
  assert.equal(refreshedSession?.lastUsedIp, forwardedIp);

  const refreshedBody = refreshed.json();
  const changed = await app.inject({
    method: 'POST',
    url: '/auth/change-password',
    remoteAddress: '127.0.0.1',
    headers: {
      authorization: `Bearer ${refreshedBody.token}` ,
      'x-forwarded-for': `${forwardedIp}, 127.0.0.1`,
      'user-agent': 'proxy-change-agent',
    },
    payload: { currentPassword: 'TempAdminPass!2026', newPassword: 'FinalAdminPass!2026' },
  });
  assert.equal(changed.statusCode, 200);
  assert.equal(db.users[0]?.lastLoginIp, forwardedIp);

  const relogin = await login(app, 'admin@example.com', 'FinalAdminPass!2026');
  assert.equal(relogin.response.statusCode, 200);
});


test('auth security regression: malformed bearer tokens are rejected without exposing internals', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  const bootstrap = await app.inject({
    method: 'POST',
    url: '/auth/bootstrap-admin',
    payload: { email: 'admin@example.com', fullName: 'Administrative Trustee', password: 'TempAdminPass!2026' },
  });
  assert.equal(bootstrap.statusCode, 200);

  const malformedToken = ['eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCIsInNpZCI6e30', 'not-json', 'signature'].join('.');
  const response = await app.inject({
    method: 'GET',
    url: '/auth/me',
    headers: { authorization: `Bearer ${malformedToken}` },
  });
  assert.equal(response.statusCode, 401);
  assert.match(response.json().message, /authentication required|invalid/i);
});
