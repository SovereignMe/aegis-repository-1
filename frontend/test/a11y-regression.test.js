import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workspaceNav = readFileSync(new URL("../src/app/components/WorkspaceNav.jsx", import.meta.url), "utf8");
const appShell = readFileSync(new URL("../src/app/AppShell.jsx", import.meta.url), "utf8");

test("workspace nav retains button semantics and image alt text", () => {
  assert.match(workspaceNav, /<button/);
  assert.match(workspaceNav, /alt="AEGIS mark"/);
});

test("auth shell preserves screen-specific auth flow components", () => {
  assert.match(appShell, /LoginScreen/);
  assert.match(appShell, /MfaChallengeScreen/);
  assert.match(appShell, /PasswordChangeScreen/);
});
