import test from "node:test";
import assert from "node:assert/strict";
import { canAccessWorkspaceTab } from "../src/utils/permissions.js";

const perms = {
  ADMIN: { "governance.read": true, "audit.summary.read": true, "audit.full.read": true },
  VIEWER: { "repository.read": true, "documents.read": true },
};

test("viewer cannot access governance or audit tabs", () => {
  assert.equal(canAccessWorkspaceTab(perms, "VIEWER", "governance"), false);
  assert.equal(canAccessWorkspaceTab(perms, "VIEWER", "audit"), false);
});

test("admin can access governance and audit tabs", () => {
  assert.equal(canAccessWorkspaceTab(perms, "ADMIN", "governance"), true);
  assert.equal(canAccessWorkspaceTab(perms, "ADMIN", "audit"), true);
});
