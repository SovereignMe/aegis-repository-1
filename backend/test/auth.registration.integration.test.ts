import test from 'node:test';
import assert from 'node:assert/strict';
import { setupApp, bootstrapAdmin, login, createManagedUser } from './integration.helpers.js';

test('auth integration: self-registration is disabled by default and admins provision delegated accounts', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  const bootstrap = await bootstrapAdmin(app);
  const adminToken = bootstrap.body.token;

  const registerResponse = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: {
      email: 'viewer@example.com',
      fullName: 'Delegated Viewer',
      password: 'ViewerPass!2026',
    },
  });

  assert.equal(registerResponse.statusCode, 403);
  assert.match(registerResponse.json().message, /self-registration is disabled/i);

  const created = await createManagedUser(app, adminToken, {
    email: 'viewer@example.com',
    fullName: 'Delegated Viewer',
    role: 'VIEWER',
    password: 'ViewerPass!2026',
  });

  assert.equal(created.response.statusCode, 200);
  assert.equal(created.body.user.email, 'viewer@example.com');
  assert.equal(created.body.user.role, 'VIEWER');

  const loginResult = await login(app, 'viewer@example.com', 'ViewerPass!2026');
  assert.equal(loginResult.response.statusCode, 200);
  assert.equal(loginResult.body.user.email, 'viewer@example.com');
});
