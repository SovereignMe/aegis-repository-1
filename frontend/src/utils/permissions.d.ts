import type {
  PermissionAction,
  PermissionMatrix,
  WorkspaceTabKey,
} from "@trust-governance/shared/permissions";
export const PermissionLabels: Record<string, string>;
export function normalizePermissionsMatrix(input: Partial<PermissionMatrix> | Record<string, any>): PermissionMatrix;
export function canPerform(permissions: Partial<PermissionMatrix> | Record<string, any>, role: string, action: PermissionAction): boolean;
export function hasAnyPermission(permissions: Partial<PermissionMatrix> | Record<string, any>, role: string, actions: readonly PermissionAction[]): boolean;
export function canAccessWorkspaceTab(permissions: Partial<PermissionMatrix> | Record<string, any>, role: string, tab: WorkspaceTabKey): boolean;
