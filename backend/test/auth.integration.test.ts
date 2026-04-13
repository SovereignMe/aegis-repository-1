import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/services/inMemoryStore.js';
import { setupApp, bootstrapAdmin, login } from './integration.helpers.js';

test('auth integration: bootstrap, login, session listing, and password change invalidate prior sessions', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  const bootstrap = await bootstrapAdmin(app);
  assert.equal(bootstrap.response.statusCode, 200);
  assert.equal(bootstrap.body.bootstrapComplete, true);
  assert.equal(bootstrap.body.user.email, 'admin@example.com');

  const loginResult = await login(app, 'admin@example.com', 'TempAdminPass!2026');
  assert.equal(loginResult.response.statusCode, 200);
  const token = loginResult.body.token;
  assert.ok(token);

  const sessionsResponse = await app.inject({ method: 'GET', url: '/auth/sessions', headers: { authorization: `Bearer ${token}` } });
  assert.equal(sessionsResponse.statusCode, 200);
  const sessionsBody = sessionsResponse.json();
  assert.equal(Array.isArray(sessionsBody.sessions), true);
  assert.equal(sessionsBody.sessions.length >= 2, true);

  const changePassword = await app.inject({
    method: 'POST',
    url: '/auth/change-password',
    headers: { authorization: `Bearer ${token}` },
    payload: { currentPassword: 'TempAdminPass!2026', newPassword: 'FinalAdminPass!2026' },
  });
  assert.equal(changePassword.statusCode, 200);
  const changedBody = changePassword.json();
  assert.equal(changedBody.success, true);
  assert.equal(changedBody.sessionsRevoked >= 2, true);

  const oldSessionsResponse = await app.inject({ method: 'GET', url: '/auth/sessions', headers: { authorization: `Bearer ${token}` } });
  assert.equal(oldSessionsResponse.statusCode, 401);

  const relogin = await login(app, 'admin@example.com', 'FinalAdminPass!2026');
  assert.equal(relogin.response.statusCode, 200);
  const reloginSessions = await app.inject({ method: 'GET', url: '/auth/sessions', headers: { authorization: `Bearer ${relogin.body.token}` } });
  assert.equal(reloginSessions.statusCode, 200);
  assert.equal(reloginSessions.json().sessions.length >= 1, true);

  const invalidRefresh = await app.inject({ method: 'POST', url: '/auth/refresh', cookies: { hlh_refresh_token: 'bogus-token' } as any });
  assert.equal(invalidRefresh.statusCode, 401);
  assert.match(invalidRefresh.json().message, /invalid or expired/i);

  assert.equal(db.users.length, 1);
  assert.equal((db.users[0].sessionVersion || 0) >= 2, true);
});


test('auth integration: mfa challenge and qr enrollment flow complete end to end', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  await bootstrapAdmin(app);

  const firstLogin = await login(app, 'admin@example.com', 'TempAdminPass!2026');
  assert.equal(firstLogin.response.statusCode, 200);
  assert.equal(firstLogin.body.user.mfaSetupRequired, true);

  const setup = await app.inject({
    method: 'POST',
    url: '/auth/mfa/setup',
    headers: { authorization: `Bearer ${firstLogin.body.token}` },
  });
  assert.equal(setup.statusCode, 200);
  const setupBody = setup.json();
  assert.equal(typeof setupBody.otpauthUri, 'string');
  assert.equal('secret' in setupBody, false);

  const secretMatch = String(setupBody.otpauthUri).match(/secret=([^&]+)/);
  assert.ok(secretMatch);
  const secret = secretMatch[1];
  const { mfaDomainService } = await import('../src/modules/auth/mfa-domain-service.js');
  const enable = await app.inject({
    method: 'POST',
    url: '/auth/mfa/enable',
    headers: { authorization: `Bearer ${firstLogin.body.token}` },
    payload: { code: mfaDomainService.generateOtp(secret) },
  });
  assert.equal(enable.statusCode, 200);
  assert.equal(enable.json().success, true);

  const secondLogin = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email: 'admin@example.com', password: 'TempAdminPass!2026' },
  });
  assert.equal(secondLogin.statusCode, 200);
  const challengeBody = secondLogin.json();
  assert.equal(challengeBody.requiresMfa, true);
  assert.equal(typeof challengeBody.challengeToken, 'string');

  const verify = await app.inject({
    method: 'POST',
    url: '/auth/mfa/verify-challenge',
    payload: { challengeToken: challengeBody.challengeToken, code: mfaDomainService.generateOtp(secret) },
  });
  assert.equal(verify.statusCode, 200);
  assert.ok(verify.json().token);
});
