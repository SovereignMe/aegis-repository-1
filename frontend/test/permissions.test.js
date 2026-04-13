import test from 'node:test';
import assert from 'node:assert/strict';
import { canPerform, normalizePermissionsMatrix } from '../src/utils/permissions.js';

test('normalizePermissionsMatrix maps legacy keys into tightened scopes', () => {
  const permissions = normalizePermissionsMatrix({
    VIEWER: {
      'audit.read': true,
      'export.use': true,
      'governance.notice': true,
    },
  });

  assert.equal(permissions.VIEWER['documents.read'], true);
  assert.equal(permissions.VIEWER['audit.summary.read'], true);
  assert.equal(permissions.VIEWER['audit.full.read'], false);
  assert.equal(permissions.VIEWER['exports.repository'], true);
  assert.equal(permissions.VIEWER['notices.read'], true);
  assert.equal(permissions.VIEWER['notices.serve'], true);
});

test('canPerform reads the normalized permissions matrix', () => {
  const permissions = normalizePermissionsMatrix({
    ADMIN: {
      'settings.write': false,
      'audit.full.read': false,
    },
  });

  assert.equal(canPerform(permissions, 'ADMIN', 'settings.write'), false);
  assert.equal(canPerform(permissions, 'VIEWER', 'exports.repository'), false);
  assert.equal(canPerform(permissions, 'VIEWER', 'audit.full.read'), false);
});
