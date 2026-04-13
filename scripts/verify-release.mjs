#!/usr/bin/env node
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = process.env.RELEASE_ROOT ? path.resolve(process.env.RELEASE_ROOT) : path.resolve(new URL('..', import.meta.url).pathname);
const forbiddenNames = new Set([
  'node_modules', 'dist', 'uploads', 'evidence-bundles', '.env', '.env.local', '.env.production', 'local-state.json'
]);
const forbiddenDirFragments = [
  `${path.sep}backend${path.sep}data${path.sep}`,
  `${path.sep}frontend${path.sep}dist${path.sep}`,
  `${path.sep}backend${path.sep}dist${path.sep}`,
];
const allowedRoots = new Set(['.git', '.github']);
const violations = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full) || entry.name;
    if (allowedRoots.has(rel)) continue;
    if (forbiddenNames.has(entry.name)) violations.push(rel);
    if (forbiddenDirFragments.some((frag) => full.includes(frag))) violations.push(rel);
    if (entry.isDirectory()) await walk(full);
  }
}

await walk(root);
const unique = [...new Set(violations)].sort();
if (unique.length) {
  console.error('Forbidden release content detected:');
  for (const item of unique) console.error(` - ${item}`);
  process.exit(1);
}
console.log('Release verification passed.');
