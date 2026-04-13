import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(__dirname, '../src/services/storageService.ts');
const source = fs.readFileSync(sourcePath, 'utf8');

test('storage service regression: local cache remains opt-in behind VITE_ENABLE_LOCAL_CACHE=true', () => {
  assert.match(source, /VITE_ENABLE_LOCAL_CACHE\s*\|\|\s*"false"/);
  assert.match(source, /toLowerCase\(\)\s*===\s*"true"/);
  assert.match(source, /if \(!localCacheEnabled \|\| !isIndexedDbAvailable\(\)\) return false;/);
});

test('storage service regression: explicit wipe path remains available', () => {
  assert.match(source, /async wipe\(\): Promise<boolean>/);
  assert.match(source, /return deleteDatabase\(\);/);
});
