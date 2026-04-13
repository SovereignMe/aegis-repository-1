import test from 'node:test';
import assert from 'node:assert/strict';

async function importFresh(specifier) {
  return import(`${specifier}?t=${Date.now()}-${Math.random()}`);
}

test('frontend auth/session: login stores token and bodyless MFA setup omits json content-type', async () => {
  const fetchCalls = [];
  global.fetch = async (url, _options = {}) => {
    fetchCalls.push({ url, options: _options });
    if (String(url).endsWith('/auth/login')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ token: 'login-token', user: { email: 'admin@example.com' } }),
      };
    }
    if (String(url).endsWith('/auth/mfa/setup')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ secret: 'ABC123' }),
      };
    }
    throw new Error(`Unexpected fetch ${url}`);
  };

  const { authService } = await importFresh('../src/services/authService.ts');
  const { getAuthToken } = await import('../src/services/apiClient.ts');

  const loginResult = await authService.login('admin@example.com', 'AdminPass!2026');
  assert.equal(loginResult.token, 'login-token');
  assert.equal(getAuthToken(), 'login-token');

  const setupResult = await authService.beginMfaSetup();
  assert.equal(setupResult.secret, 'ABC123');

  const mfaCall = fetchCalls.find((call) => String(call.url).endsWith('/auth/mfa/setup'));
  assert.ok(mfaCall);
  assert.equal(mfaCall.options.method, 'POST');
  assert.equal(Object.hasOwn(mfaCall.options.headers || {}, 'Content-Type'), false);
});

test('frontend auth/session: non-auth request retries once after refresh and preserves new bearer token', async () => {
  const fetchCalls = [];
  global.fetch = async (url, _options = {}) => {
    fetchCalls.push({ url, options: _options });
    if (String(url).endsWith('/auth/refresh')) {
      return { ok: true, status: 200, json: async () => ({ token: 'refreshed-token' }) };
    }
    if (String(url).endsWith('/auth/me') && !_options.headers?.Authorization) {
      return { ok: false, status: 401, text: async () => JSON.stringify({ message: 'expired' }) };
    }
    if (String(url).endsWith('/documents')) {
      if (_options.headers?.Authorization === 'Bearer stale-token') {
        return { ok: false, status: 401, text: async () => JSON.stringify({ message: 'expired' }) };
      }
      assert.equal(_options.headers?.Authorization, 'Bearer refreshed-token');
      return { ok: true, status: 200, json: async () => ([{ id: 'doc-1' }]) };
    }
    throw new Error(`Unexpected fetch ${url}`);
  };

  const apiModule = await importFresh('../src/services/apiClient.ts');
  apiModule.setAuthToken('stale-token');

  const result = await apiModule.apiClient.get('/documents');
  assert.equal(result.length, 1);
  assert.equal(apiModule.getAuthToken(), 'refreshed-token');
  assert.equal(fetchCalls.filter((call) => String(call.url).endsWith('/auth/refresh')).length, 1);
});

test('frontend auth/session: failed refresh clears token and logout clears local token even on server failure', async () => {
  global.fetch = async (url, _options = {}) => {
    if (String(url).endsWith('/auth/refresh')) {
      return { ok: false, status: 401, text: async () => JSON.stringify({ message: 'refresh failed' }) };
    }
    if (String(url).endsWith('/tasks')) {
      return { ok: false, status: 401, text: async () => JSON.stringify({ message: 'expired' }) };
    }
    if (String(url).endsWith('/auth/logout')) {
      return { ok: false, status: 500, text: async () => 'server failure' };
    }
    throw new Error(`Unexpected fetch ${url}`);
  };

  const apiModule = await import('../src/services/apiClient.ts');
  const { authService } = await import('../src/services/authService.ts');
  apiModule.setAuthToken('stale-token');

  await assert.rejects(() => apiModule.apiClient.get('/tasks'), /Session refresh failed/i);
  assert.equal(apiModule.getAuthToken(), '');

  apiModule.setAuthToken('logout-token');
  await assert.rejects(() => authService.logout(), /server failure/i);
  assert.equal(apiModule.getAuthToken(), '');
});
