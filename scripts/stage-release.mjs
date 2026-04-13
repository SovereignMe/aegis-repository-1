#!/usr/bin/env node
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL('..', import.meta.url).pathname);
const stageDir = path.join(root, 'release-artifacts', 'source-release');
await rm(stageDir, { recursive: true, force: true });
await mkdir(stageDir, { recursive: true });

const include = [
  'README.md','README_STANDALONE.md','PRODUCTION_HARDENING_SUMMARY.md','package.json','package-lock.json','tsconfig.base.json','.gitignore',
  'backend','frontend','shared','docs','scripts','.github'
];
const exclude = [
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)dist(\/|$)/,
  /(^|\/)backend\/data(\/|$)/,
  /(^|\/)backend\/\.env($|\.)/,
  /(^|\/)frontend\/\.env($|\.)/,
  /(^|\/)shared_backup(\/|$)/,
  /(^|\/)uploads(\/|$)/,
  /(^|\/)evidence-bundles(\/|$)/,
  /(^|\/)\.env($|\.)/,
  /(^|\/).*\.(db|sqlite|sqlite3)$/
];

for (const item of include) {
  await cp(path.join(root, item), path.join(stageDir, item), {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(root, src);
      return !exclude.some((rx) => rx.test(rel));
    },
  });
}
console.log(`Release staged at ${stageDir}`);
