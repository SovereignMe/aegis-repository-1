import {
  PermissionLabels,
  hasAnyPermission,
  hasPermission,
  normalizePermissionsMatrix,
  WORKSPACE_TAB_ACCESS,
} from "@trust-governance/shared/permissions";

export { PermissionLabels, hasAnyPermission, normalizePermissionsMatrix };

export function canAccessWorkspaceTab(permissions, role, tab) {
  const roleKey = typeof role === "string" && role ? role : "VIEWER";
  const rolePermissions = permissions?.[roleKey] || {};
  const actions = WORKSPACE_TAB_ACCESS?.[tab] || [];
  if (rolePermissions["governance.read"] && tab === "governance") return true;
  return actions.some((action) => Boolean(rolePermissions?.[action]));
}

export function canPerform(permissions, role, action) {
  return hasPermission(permissions, role, action);
}
