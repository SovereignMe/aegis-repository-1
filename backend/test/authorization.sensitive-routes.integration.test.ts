import test from 'node:test';
import assert from 'node:assert/strict';
import { setupApp, bootstrapAdmin, createManagedUser, login, createMultipartPayload } from './integration.helpers.js';

type Session = { role: 'ADMIN' | 'EDITOR' | 'VIEWER'; token: string };
type RouteCase = {
  name: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  url: string;
  allowedRoles: Array<Session['role']>;
  payload?: unknown;
};

const sensitiveRoutes: RouteCase[] = [
  { name: 'list documents', method: 'GET', url: '/documents', allowedRoles: ['ADMIN', 'EDITOR', 'VIEWER'] },
  { name: 'create document', method: 'POST', url: '/documents', allowedRoles: ['ADMIN', 'EDITOR'], payload: { title: 'Administrative Record', docType: 'correspondence' } },
  { name: 'upload document', method: 'POST', url: '/documents/upload', allowedRoles: ['ADMIN', 'EDITOR'] },
  { name: 'archive document', method: 'PATCH', url: '/documents/doc-unauthorized/archive', allowedRoles: ['ADMIN', 'EDITOR'] },
  { name: 'storage metadata', method: 'GET', url: '/meta/storage', allowedRoles: ['ADMIN', 'EDITOR', 'VIEWER'] },
  { name: 'verify audit', method: 'GET', url: '/audit/verify', allowedRoles: ['ADMIN', 'EDITOR'] },
  { name: 'read full audit', method: 'GET', url: '/audit', allowedRoles: ['ADMIN'] },
  { name: 'list users', method: 'GET', url: '/auth/users', allowedRoles: ['ADMIN'] },
  { name: 'create user', method: 'POST', url: '/auth/users', allowedRoles: ['ADMIN'], payload: { email: 'route-test@example.com', fullName: 'Route Test User', role: 'VIEWER', password: 'ViewerPass!2026' } },
  { name: 'read permissions', method: 'GET', url: '/controls/permissions', allowedRoles: ['ADMIN'] },
  { name: 'write permissions', method: 'PUT', url: '/controls/permissions', allowedRoles: ['ADMIN'], payload: { permissions: { VIEWER: { 'documents.read': true } } } },
  { name: 'list integrations', method: 'GET', url: '/integrations', allowedRoles: ['ADMIN', 'EDITOR', 'VIEWER'] },
  { name: 'sync integration', method: 'PATCH', url: '/integrations/google-drive/sync', allowedRoles: ['ADMIN', 'EDITOR'] },
  { name: 'list tasks', method: 'GET', url: '/tasks', allowedRoles: ['ADMIN', 'EDITOR', 'VIEWER'] },
  { name: 'create task', method: 'POST', url: '/tasks', allowedRoles: ['ADMIN', 'EDITOR'], payload: { title: 'Follow up', dueDate: new Date(Date.now() + 86_400_000).toISOString() } },
  { name: 'complete task', method: 'PATCH', url: '/tasks/task-unauthorized/complete', allowedRoles: ['ADMIN', 'EDITOR'] },
  { name: 'list contacts', method: 'GET', url: '/contacts', allowedRoles: ['ADMIN', 'EDITOR', 'VIEWER'] },
  { name: 'write contact', method: 'POST', url: '/contacts', allowedRoles: ['ADMIN', 'EDITOR'], payload: { fullName: 'John Doe', email: 'john@example.com', status: 'TRUSTEE', country: 'US' } },
  { name: 'list timers', method: 'GET', url: '/timers', allowedRoles: ['ADMIN', 'EDITOR', 'VIEWER'] },
  { name: 'start timer', method: 'POST', url: '/timers', allowedRoles: ['ADMIN', 'EDITOR'], payload: { label: 'Review packet', timerType: 'workflow' } },
  { name: 'stop timer', method: 'PATCH', url: '/timers/timer-unauthorized/stop', allowedRoles: ['ADMIN', 'EDITOR'] },
  { name: 'read settings', method: 'GET', url: '/settings', allowedRoles: ['ADMIN', 'EDITOR', 'VIEWER'] },
  { name: 'write settings', method: 'PUT', url: '/settings', allowedRoles: ['ADMIN', 'EDITOR'], payload: { trust: { trustName: 'HLH FUTURE INVESTMENT TRUST' } } },
  { name: 'governance overview', method: 'GET', url: '/governance/overview', allowedRoles: ['ADMIN', 'EDITOR'] },
  { name: 'governance artifacts', method: 'GET', url: '/governance/artifacts', allowedRoles: ['ADMIN', 'EDITOR'] },
  { name: 'create beneficiary', method: 'POST', url: '/governance/beneficiaries', allowedRoles: ['ADMIN', 'EDITOR'], payload: { fullName: 'Beneficiary Example', relationship: 'beneficiary' } },
  { name: 'request distribution', method: 'POST', url: '/governance/distributions', allowedRoles: ['ADMIN', 'EDITOR'], payload: { beneficiaryId: 'missing-beneficiary', category: 'general-support', amount: 100 } },
  { name: 'approve distribution', method: 'PATCH', url: '/governance/distributions/distribution-unauthorized/approve', allowedRoles: ['ADMIN'], payload: { notes: 'Approved', reasonCode: 'ADMIN_RECORD' } },
  { name: 'create notice', method: 'POST', url: '/governance/notices', allowedRoles: ['ADMIN', 'EDITOR'], payload: { recipientName: 'Recipient Example', noticeType: 'administrative-notice', serviceMethod: 'mail' } },
  { name: 'serve notice', method: 'PATCH', url: '/governance/notices/notice-unauthorized/serve', allowedRoles: ['ADMIN', 'EDITOR'], payload: { trackingNumber: 'TRK-123' } },
  { name: 'build packet', method: 'POST', url: '/governance/packets', allowedRoles: ['ADMIN', 'EDITOR'], payload: { packetType: 'administrative-record', title: 'Administrative Record Packet' } },
  { name: 'approve packet', method: 'PATCH', url: '/governance/packets/packet-unauthorized/approve', allowedRoles: ['ADMIN', 'EDITOR'], payload: { notes: 'Approved', reasonCode: 'ADMIN_RECORD' } },
  { name: 'packet manifest', method: 'GET', url: '/governance/packets/packet-unauthorized/manifest', allowedRoles: ['ADMIN', 'EDITOR'] },
  { name: 'packet download', method: 'GET', url: '/governance/packets/packet-unauthorized/download', allowedRoles: ['ADMIN', 'EDITOR'] },
  { name: 'repository export', method: 'GET', url: '/export/repository', allowedRoles: ['ADMIN'] },
];

test('negative-path authorization coverage across sensitive routes', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  const bootstrap = await bootstrapAdmin(app);
  assert.equal(bootstrap.response.statusCode, 200);
  const adminToken = bootstrap.body.token as string;

  for (const user of [
    { email: 'editor@example.com', fullName: 'Editor User', role: 'EDITOR' as const, password: 'EditorPass!2026' },
    { email: 'viewer@example.com', fullName: 'Viewer User', role: 'VIEWER' as const, password: 'ViewerPass!2026' },
  ]) {
    const created = await createManagedUser(app, adminToken, user);
    assert.equal(created.response.statusCode, 200);
  }

  const editorLogin = await login(app, 'editor@example.com', 'EditorPass!2026');
  const viewerLogin = await login(app, 'viewer@example.com', 'ViewerPass!2026');
  assert.equal(editorLogin.response.statusCode, 200);
  assert.equal(viewerLogin.response.statusCode, 200);

  const sessions: Session[] = [
    { role: 'ADMIN', token: adminToken },
    { role: 'EDITOR', token: editorLogin.body.token },
    { role: 'VIEWER', token: viewerLogin.body.token },
  ];

  for (const route of sensitiveRoutes) {
    const request: any = { method: route.method, url: route.url };
    if (route.url === '/documents/upload') {
      const multipart = createMultipartPayload(
        { title: 'Upload Test', docType: 'correspondence', jurisdiction: 'ADMINISTRATIVE', status: 'pending' },
        { filename: 'memo.txt', contentType: 'text/plain', content: 'test upload body' },
      );
      request.payload = multipart.payload;
      request.headers = { 'content-type': multipart.contentType };
    } else if (route.payload !== undefined) {
      request.payload = route.payload;
    }

    const unauthenticated = await app.inject(request);
    assert.equal(unauthenticated.statusCode, 401, `${route.name} should reject unauthenticated access`);

    for (const session of sessions) {
      const response = await app.inject({
        ...request,
        headers: {
          ...(request.headers || {}),
          authorization: `Bearer ${session.token}`,
        },
      });
      const shouldAllow = route.allowedRoles.includes(session.role);
      if (shouldAllow) {
        assert.notEqual(response.statusCode, 401, `${route.name} should not treat ${session.role} as unauthenticated`);
        assert.notEqual(response.statusCode, 403, `${route.name} should not forbid ${session.role}`);
      } else {
        assert.equal(response.statusCode, 403, `${route.name} should forbid ${session.role}`);
        assert.match(response.body, /Permission denied|requires permission/i);
      }
      assert.doesNotMatch(response.body, /TypeError|stack|Cannot read/i, `${route.name} should not leak stack traces`);
    }
  }
});
