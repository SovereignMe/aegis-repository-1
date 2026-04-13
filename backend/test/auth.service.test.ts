import test from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../src/services/auth.service.js';
import { db } from '../src/services/inMemoryStore.js';
import { canPerform, normalizePermissionsMatrix } from '../src/services/authorization.service.js';

function resetUsers() {
  db.users = [];
  db.sessions = [];
}

test('AuthService issues claims-bound tokens and versioned refresh sessions for active users', async () => {
  resetUsers();
  const user = authService.createUser({
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: 'ADMIN',
    password: 'StrongPass123!'
  });

  db.users = [user];

  assert.equal(authService.verifyPassword(user, 'StrongPass123!'), true);
  assert.equal(authService.verifyPassword(user, 'wrong-password'), false);

  const refresh = authService.createRefreshSession(user, { ip: '127.0.0.1', userAgent: 'node-test' });
  const token = await authService.issueAccessToken(user, refresh.session.id);
  const currentUser = await authService.verifyToken(token);
  const session = authService.verifyRefreshToken(refresh.refreshToken, { ip: '127.0.0.1', userAgent: 'node-test' });

  assert.ok(currentUser);
  assert.equal(currentUser?.email, user.email);
  assert.equal(currentUser?.role, user.role);
  assert.equal(currentUser?.mustChangePassword, true);
  assert.equal(currentUser?.sessionId, refresh.session.id);
  assert.ok(session);
  assert.equal(session?.userId, user.id);
  assert.equal(session?.sessionVersion, 1);
});

test('AuthService invalidates prior sessions on password change via session versioning', async () => {
  resetUsers();
  const user = authService.createUser({
    email: 'admin@example.com',
    fullName: 'Admin User',
    role: 'ADMIN',
    password: 'StrongPass123!'
  });
  user.passwordChangeRequired = true;
  db.users = [user];

  const login = await authService.login(user.email, 'StrongPass123!', { ip: '127.0.0.1', userAgent: 'node-test' });
  assert.ok(await authService.verifyToken(login.token));

  const changed = await authService.changePassword(login.user, { currentPassword: 'StrongPass123!', newPassword: 'EvenStrongerPass123!' });
  assert.equal(changed.success, true);
  assert.equal(await authService.verifyToken(login.token), null);
  assert.equal(authService.verifyRefreshToken(login.refreshToken), null);
});

test('normalizePermissionsMatrix preserves defaults and upgrades legacy keys', () => {
  const permissions = normalizePermissionsMatrix({
    EDITOR: {
      upload: false,
      'tasks.create': true
    }
  });

  assert.equal(permissions.EDITOR['documents.create'], false);
  assert.equal(permissions.EDITOR['tasks.create'], true);
  assert.equal(permissions.VIEWER['audit.summary.read'], true);
  assert.equal(permissions.VIEWER['audit.full.read'], false);
  db.permissions = permissions;
  assert.equal(canPerform('audit.summary.read', 'VIEWER'), true);
  assert.equal(canPerform('audit.full.read', 'VIEWER'), false);
});
