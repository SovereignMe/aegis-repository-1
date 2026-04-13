import test from 'node:test';
import assert from 'node:assert/strict';
import { setupApp, bootstrapAdmin, createManagedUser, login } from './integration.helpers.js';

test('authorization integration: unauthenticated metadata endpoints are controlled and viewers are blocked from sensitive scopes', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  const unauthenticatedEndpoints = ['/meta/storage', '/controls/role', '/auth/sessions', '/audit'];
  for (const url of unauthenticatedEndpoints) {
    const response = await app.inject({ method: 'GET', url });
    assert.equal(response.statusCode, 401, `${url} should require auth`);
    assert.doesNotMatch(response.body, /TypeError|stack|Cannot read/i);
  }

  const bootstrap = await bootstrapAdmin(app);
  const adminToken = bootstrap.body.token;

  const viewerCreate = await createManagedUser(app, adminToken, {
    email: 'viewer@example.com',
    fullName: 'Viewer User',
    role: 'VIEWER',
    password: 'ViewerPass!2026',
  });
  assert.equal(viewerCreate.response.statusCode, 200);

  const viewerLogin = await login(app, 'viewer@example.com', 'ViewerPass!2026');
  assert.equal(viewerLogin.response.statusCode, 200);
  const viewerToken = viewerLogin.body.token;

  for (const url of ['/audit', '/export/repository', '/controls/permissions']) {
    const response = await app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${viewerToken}` } });
    assert.equal(response.statusCode, 403, `${url} should be forbidden for viewers`);
    assert.doesNotMatch(response.body, /TypeError|stack|Cannot read/i);
  }

  const roleResponse = await app.inject({ method: 'GET', url: '/controls/role', headers: { authorization: `Bearer ${viewerToken}` } });
  assert.equal(roleResponse.statusCode, 200);
  assert.equal(roleResponse.json().role, 'VIEWER');
});
