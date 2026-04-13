import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PERMISSION_MATRIX,
  PERMISSION_ACTIONS,
  USER_ROLES,
  normalizePermissionsMatrix,
} from '@trust-governance/shared/permissions';

test('shared permissions contract covers every role and action', () => {
  for (const role of USER_ROLES) {
    const config = DEFAULT_PERMISSION_MATRIX[role];
    assert.ok(config, `missing role config for ${role}`);
    for (const action of PERMISSION_ACTIONS) {
      assert.equal(typeof config[action], 'boolean', `missing action ${action} for ${role}`);
    }
  }
});

test('shared permissions normalization upgrades legacy keys without dropping defaults', () => {
  const matrix = normalizePermissionsMatrix({
    EDITOR: {
      upload: false,
      'tasks.create': true,
      'governance.notice': true,
    },
  });

  assert.equal(matrix.EDITOR['documents.create'], false);
  assert.equal(matrix.EDITOR['tasks.create'], true);
  assert.equal(matrix.EDITOR['notices.read'], true);
  assert.equal(matrix.VIEWER['documents.read'], true);
  assert.equal(matrix.ADMIN['controls.permissions'], true);
});
