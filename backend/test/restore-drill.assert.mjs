/* global console */
import assert from 'node:assert/strict';
import { db } from '../src/services/inMemoryStore.js';
import { runBackupRestoreDrill } from '../src/services/backup-drill.service.js';

await db.init();
const result = await runBackupRestoreDrill();
assert.equal(result.ok, true, `Restore drill returned non-ok state: ${JSON.stringify(result)}`);
for (const [key, value] of Object.entries(result.checks || {})) {
  assert.equal(value, true, `Restore drill check failed for ${key}`);
}
console.log(JSON.stringify({ type: 'restore-drill', result }, null, 2));
