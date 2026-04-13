#!/usr/bin/env node
import { access } from "node:fs/promises";

const required = [
  "scripts/verify-release.mjs",
  "scripts/stage-release.mjs",
  "docs/threat-model/AEGIS-threat-model.md",
];

let failed = false;
for (const file of required) {
  try {
    await access(new URL(`../${file}`, import.meta.url));
  } catch {
    console.error(`Missing required production-readiness asset: ${file}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("Production readiness checks passed.");
