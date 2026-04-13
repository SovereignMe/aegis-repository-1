export const USER_ROLES = ["VIEWER", "EDITOR", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PERMISSION_ACTIONS = [
  "documents.read",
  "documents.create",
  "documents.archive",
  "intake.create",
  "contacts.read",
  "contacts.write",
  "tasks.read",
  "tasks.create",
  "tasks.complete",
  "integrations.read",
  "integrations.sync",
  "settings.read",
  "settings.write",
  "controls.role",
  "controls.permissions",
  "timers.read",
  "timers.start",
  "timers.stop",
  "audit.summary.read",
  "audit.full.read",
  "audit.verify",
  "beneficiaries.read",
  "beneficiaries.write",
  "distributions.read",
  "distributions.request",
  "distributions.approve",
  "notices.read",
  "notices.write",
  "notices.serve",
  "accounting.read",
  "exports.repository",
  "governance.packet",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type PermissionMatrix = Record<UserRole, Record<PermissionAction, boolean>>;

export type WorkspaceTabKey =
  | "governance"
  | "repository"
  | "intake"
  | "contacts"
  | "deadlines"
  | "audit"
  | "controls"
  | "settings"
  | "integrations";

export interface WorkspaceTabContract {
  key: WorkspaceTabKey;
  label: string;
  anyOf: readonly PermissionAction[];
}

export const DEFAULT_PERMISSION_MATRIX: PermissionMatrix = {
  VIEWER: {
    "documents.read": true,
    "documents.create": false,
    "documents.archive": false,
    "intake.create": false,
    "contacts.read": true,
    "contacts.write": false,
    "tasks.read": true,
    "tasks.create": false,
    "tasks.complete": false,
    "integrations.read": true,
    "integrations.sync": false,
    "settings.read": true,
    "settings.write": false,
    "controls.role": false,
    "controls.permissions": false,
    "timers.read": true,
    "timers.start": false,
    "timers.stop": false,
    "audit.summary.read": true,
    "audit.full.read": false,
    "audit.verify": false,
    "beneficiaries.read": false,
    "beneficiaries.write": false,
    "distributions.read": false,
    "distributions.request": false,
    "distributions.approve": false,
    "notices.read": false,
    "notices.write": false,
    "notices.serve": false,
    "accounting.read": false,
    "exports.repository": false,
    "governance.packet": false,
  },
  EDITOR: {
    "documents.read": true,
    "documents.create": true,
    "documents.archive": true,
    "intake.create": true,
    "contacts.read": true,
    "contacts.write": true,
    "tasks.read": true,
    "tasks.create": true,
    "tasks.complete": true,
    "integrations.read": true,
    "integrations.sync": true,
    "settings.read": true,
    "settings.write": true,
    "controls.role": false,
    "controls.permissions": false,
    "timers.read": true,
    "timers.start": true,
    "timers.stop": true,
    "audit.summary.read": true,
    "audit.full.read": false,
    "audit.verify": true,
    "beneficiaries.read": true,
    "beneficiaries.write": true,
    "distributions.read": true,
    "distributions.request": true,
    "distributions.approve": false,
    "notices.read": true,
    "notices.write": true,
    "notices.serve": true,
    "accounting.read": true,
    "exports.repository": false,
    "governance.packet": true,
  },
  ADMIN: {
    "documents.read": true,
    "documents.create": true,
    "documents.archive": true,
    "intake.create": true,
    "contacts.read": true,
    "contacts.write": true,
    "tasks.read": true,
    "tasks.create": true,
    "tasks.complete": true,
    "integrations.read": true,
    "integrations.sync": true,
    "settings.read": true,
    "settings.write": true,
    "controls.role": true,
    "controls.permissions": true,
    "timers.read": true,
    "timers.start": true,
    "timers.stop": true,
    "audit.summary.read": true,
    "audit.full.read": true,
    "audit.verify": true,
    "beneficiaries.read": true,
    "beneficiaries.write": true,
    "distributions.read": true,
    "distributions.request": true,
    "distributions.approve": true,
    "notices.read": true,
    "notices.write": true,
    "notices.serve": true,
    "accounting.read": true,
    "exports.repository": true,
    "governance.packet": true,
  },
};

const LEGACY_KEY_MAP: Record<string, PermissionAction> = {
  upload: "documents.create",
  archive: "documents.archive",
  intake: "intake.create",
  permissions: "controls.permissions",
  export: "exports.repository",
  "export.use": "exports.repository",
  "governance.distribute": "distributions.approve",
  "governance.packet": "governance.packet",
};

const LEGACY_READ_EXPANSION: PermissionAction[] = [
  "documents.read",
  "contacts.read",
  "tasks.read",
  "integrations.read",
  "settings.read",
  "timers.read",
  "audit.summary.read",
];

const LEGACY_GOVERNANCE_WRITE_EXPANSION: PermissionAction[] = [
  "beneficiaries.read",
  "beneficiaries.write",
  "distributions.read",
  "distributions.request",
];

const LEGACY_GOVERNANCE_NOTICE_EXPANSION: PermissionAction[] = [
  "notices.read",
  "notices.write",
  "notices.serve",
];

function applyLegacyKey(roleConfig: Record<PermissionAction, boolean>, rawKey: string, value: boolean) {
  if (rawKey === "audit.read") {
    for (const action of LEGACY_READ_EXPANSION) roleConfig[action] = value;
    return;
  }

  if (rawKey === "governance.write") {
    for (const action of LEGACY_GOVERNANCE_WRITE_EXPANSION) roleConfig[action] = value;
    return;
  }

  if (rawKey === "governance.notice") {
    for (const action of LEGACY_GOVERNANCE_NOTICE_EXPANSION) roleConfig[action] = value;
    return;
  }

  const mapped = LEGACY_KEY_MAP[rawKey];
  if (mapped) roleConfig[mapped] = value;
}

export function normalizePermissionsMatrix(
  input: Record<string, Record<string, boolean>> | null | undefined,
): PermissionMatrix {
  const next: PermissionMatrix = structuredClone(DEFAULT_PERMISSION_MATRIX);

  if (!input || typeof input !== "object") return next;

  for (const [roleKey, config] of Object.entries(input)) {
    const typedRole: UserRole = USER_ROLES.includes(roleKey as UserRole)
      ? (roleKey as UserRole)
      : "VIEWER";

    const roleConfig = { ...next[typedRole] };

    for (const [rawKey, value] of Object.entries(config || {})) {
      if ((PERMISSION_ACTIONS as readonly string[]).includes(rawKey)) {
        roleConfig[rawKey as PermissionAction] = Boolean(value);
        continue;
      }

      applyLegacyKey(roleConfig, rawKey, Boolean(value));
    }

    next[typedRole] = roleConfig;
  }

  return next;
}

export function hasPermission(
  permissions: Record<string, Record<string, boolean>> | PermissionMatrix | null | undefined,
  role: string | null | undefined,
  action: PermissionAction,
): boolean {
  const resolvedRole: UserRole = USER_ROLES.includes(role as UserRole) ? (role as UserRole) : "VIEWER";
  const matrix = normalizePermissionsMatrix(permissions);
  return Boolean(matrix?.[resolvedRole]?.[action]);
}

export function hasAnyPermission(
  permissions: Record<string, Record<string, boolean>> | PermissionMatrix | null | undefined,
  role: string | null | undefined,
  actions: readonly PermissionAction[],
): boolean {
  return actions.some((action) => hasPermission(permissions, role, action));
}

export const GOVERNANCE_TAB_ACTIONS = [
  "beneficiaries.read",
  "beneficiaries.write",
  "distributions.read",
  "distributions.request",
  "notices.read",
  "notices.write",
  "accounting.read",
  "governance.packet",
] as const satisfies readonly PermissionAction[];

export const AUDIT_TAB_ACTIONS = [
  "audit.summary.read",
  "audit.full.read",
  "audit.verify",
] as const satisfies readonly PermissionAction[];

export const WORKSPACE_TAB_CONTRACTS: readonly WorkspaceTabContract[] = [
  { key: "governance", label: "GOVERNANCE", anyOf: GOVERNANCE_TAB_ACTIONS },
  { key: "repository", label: "REPOSITORY", anyOf: ["documents.read"] },
  { key: "intake", label: "INTAKE", anyOf: ["intake.create"] },
  { key: "contacts", label: "CONTACTS", anyOf: ["contacts.read"] },
  { key: "deadlines", label: "DEADLINES", anyOf: ["tasks.read"] },
  { key: "audit", label: "AUDITS", anyOf: AUDIT_TAB_ACTIONS },
  { key: "controls", label: "CONTROLS", anyOf: ["controls.permissions"] },
  { key: "settings", label: "SETTINGS", anyOf: ["settings.read"] },
  { key: "integrations", label: "INTEGRATIONS", anyOf: ["integrations.read"] },
] as const;

export const WORKSPACE_TAB_ACCESS: Record<WorkspaceTabKey, readonly PermissionAction[]> =
  Object.fromEntries(
    WORKSPACE_TAB_CONTRACTS.map((tab) => [tab.key, tab.anyOf]),
  ) as Record<WorkspaceTabKey, readonly PermissionAction[]>;

export function canAccessWorkspaceTab(
  permissions: Record<string, Record<string, boolean>> | PermissionMatrix | null | undefined,
  role: string | null | undefined,
  tab: WorkspaceTabKey,
): boolean {
  return hasAnyPermission(permissions, role, WORKSPACE_TAB_ACCESS[tab] || []);
}

export const PermissionLabels: Record<PermissionAction, string> = {
  "documents.read": "Documents Read",
  "documents.create": "Documents Create",
  "documents.archive": "Documents Archive",
  "intake.create": "Intake Create",
  "contacts.read": "Contacts Read",
  "contacts.write": "Contacts Write",
  "tasks.read": "Tasks Read",
  "tasks.create": "Tasks Create",
  "tasks.complete": "Tasks Complete",
  "integrations.read": "Integrations Read",
  "integrations.sync": "Integrations Sync",
  "settings.read": "Settings Read",
  "settings.write": "Settings Write",
  "controls.role": "Role Change",
  "controls.permissions": "Permissions Edit",
  "timers.read": "Timers Read",
  "timers.start": "Timers Start",
  "timers.stop": "Timers Stop",
  "audit.summary.read": "Audit Summary Read",
  "audit.full.read": "Audit Full Read",
  "audit.verify": "Audit Verify",
  "beneficiaries.read": "Beneficiaries Read",
  "beneficiaries.write": "Beneficiaries Write",
  "distributions.read": "Distributions Read",
  "distributions.request": "Distributions Request",
  "distributions.approve": "Distributions Approve",
  "notices.read": "Notices Read",
  "notices.write": "Notices Write",
  "notices.serve": "Notices Serve",
  "accounting.read": "Accounting Read",
  "exports.repository": "Repository Export",
  "governance.packet": "Governance Packet",
};
