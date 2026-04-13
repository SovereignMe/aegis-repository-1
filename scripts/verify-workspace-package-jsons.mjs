#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const rootPkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const workspaces = Array.isArray(rootPkg.workspaces) ? rootPkg.workspaces : [];
if (workspaces.length === 0) throw new Error('No workspaces configured');
for (const ws of workspaces) {
  const pkgPath = path.join(root, ws, 'package.json');
  if (!existsSync(pkgPath)) throw new Error();
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (!pkg.name) throw new Error();
  if (!pkg.version) throw new Error();
  if (pkg.private !== true && ws !== 'shared') {
    throw new Error();
  }
}
console.log('Workspace package manifests verified.');

