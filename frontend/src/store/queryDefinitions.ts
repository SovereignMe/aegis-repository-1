import { authService } from "../services/authService";
import { settingsService } from "../services/settingsService";
import { contactService } from "../services/contactService";
import { taskService } from "../services/taskService";
import { integrationService } from "../services/integrationService";
import { documentService } from "../services/documentService";
import { controlService } from "../services/controlService";
import { timerService } from "../services/timerService";
import { diagnosticsService } from "../services/diagnosticsService";
import { safeRequest } from "../services/bootstrapService";
import { apiClient } from "../services/apiClient";
import { normalizePermissionsMatrix } from "../utils/permissions";
import type { QueryFactoryMap, QuerySetterMap } from "../models/types";

export const APP_QUERY_KEYS = {
  currentUser: "currentUser",
  settings: "settings",
  rules: "rules",
  integrations: "integrations",
  documents: "documents",
  role: "role",
  permissions: "permissions",
  timers: "timers",
  contacts: "contacts",
  tasks: "tasks",
  auditTrail: "auditTrail",
  auditVerification: "auditVerification",
  storageMeta: "storageMeta",
  governanceOverview: "governanceOverview",
  governanceArtifacts: "governanceArtifacts",
  governancePolicies: "governancePolicies",
  health: "health",
  readiness: "readiness",
  metrics: "metrics",
  diagnostics: "diagnostics",
  users: "users",
} as const;

export type AppQueryKey = typeof APP_QUERY_KEYS[keyof typeof APP_QUERY_KEYS];

export const SESSION_QUERY_KEYS: AppQueryKey[] = [
  APP_QUERY_KEYS.currentUser,
  APP_QUERY_KEYS.settings,
  APP_QUERY_KEYS.rules,
  APP_QUERY_KEYS.integrations,
  APP_QUERY_KEYS.documents,
  APP_QUERY_KEYS.role,
  APP_QUERY_KEYS.permissions,
  APP_QUERY_KEYS.timers,
  APP_QUERY_KEYS.contacts,
  APP_QUERY_KEYS.tasks,
  APP_QUERY_KEYS.auditTrail,
  APP_QUERY_KEYS.auditVerification,
  APP_QUERY_KEYS.storageMeta,
  APP_QUERY_KEYS.governanceOverview,
  APP_QUERY_KEYS.governanceArtifacts,
  APP_QUERY_KEYS.governancePolicies,
  APP_QUERY_KEYS.health,
  APP_QUERY_KEYS.readiness,
  APP_QUERY_KEYS.metrics,
  APP_QUERY_KEYS.diagnostics,
  APP_QUERY_KEYS.users,
];

export const QUERY_OPTIONS: Record<AppQueryKey, { staleTimeMs: number; cacheTimeMs: number; backgroundRefetch?: boolean; retry?: number }> = {
  currentUser: { staleTimeMs: 10_000, cacheTimeMs: 60_000, retry: 0 },
  settings: { staleTimeMs: 30_000, cacheTimeMs: 5 * 60_000, backgroundRefetch: true },
  rules: { staleTimeMs: 30_000, cacheTimeMs: 5 * 60_000, backgroundRefetch: true },
  integrations: { staleTimeMs: 15_000, cacheTimeMs: 2 * 60_000, backgroundRefetch: true },
  documents: { staleTimeMs: 20_000, cacheTimeMs: 2 * 60_000, backgroundRefetch: true },
  role: { staleTimeMs: 60_000, cacheTimeMs: 5 * 60_000 },
  permissions: { staleTimeMs: 60_000, cacheTimeMs: 5 * 60_000 },
  timers: { staleTimeMs: 5_000, cacheTimeMs: 30_000, backgroundRefetch: true },
  contacts: { staleTimeMs: 30_000, cacheTimeMs: 5 * 60_000, backgroundRefetch: true },
  tasks: { staleTimeMs: 15_000, cacheTimeMs: 2 * 60_000, backgroundRefetch: true },
  auditTrail: { staleTimeMs: 10_000, cacheTimeMs: 2 * 60_000, backgroundRefetch: true },
  auditVerification: { staleTimeMs: 20_000, cacheTimeMs: 2 * 60_000 },
  storageMeta: { staleTimeMs: 20_000, cacheTimeMs: 2 * 60_000 },
  governanceOverview: { staleTimeMs: 15_000, cacheTimeMs: 2 * 60_000, backgroundRefetch: true },
  governanceArtifacts: { staleTimeMs: 15_000, cacheTimeMs: 2 * 60_000, backgroundRefetch: true },
  governancePolicies: { staleTimeMs: 15_000, cacheTimeMs: 2 * 60_000, backgroundRefetch: true },
  health: { staleTimeMs: 15_000, cacheTimeMs: 60_000, backgroundRefetch: true, retry: 0 },
  readiness: { staleTimeMs: 15_000, cacheTimeMs: 60_000, backgroundRefetch: true, retry: 0 },
  metrics: { staleTimeMs: 20_000, cacheTimeMs: 60_000, backgroundRefetch: true, retry: 0 },
  diagnostics: { staleTimeMs: 20_000, cacheTimeMs: 60_000, backgroundRefetch: true, retry: 0 },
  users: { staleTimeMs: 15_000, cacheTimeMs: 2 * 60_000 },
};

export function createQueryFactories(context: { currentUser?: { role?: string } | null; role?: string | null }): QueryFactoryMap {
  const { currentUser, role } = context;

  return {
    [APP_QUERY_KEYS.currentUser]: async () => authService.getCurrentUser().then((payload) => payload.user),
    [APP_QUERY_KEYS.settings]: async () => safeRequest(() => settingsService.getSettings(), null),
    [APP_QUERY_KEYS.rules]: async () => safeRequest(() => taskService.listRules(), []),
    [APP_QUERY_KEYS.integrations]: async () => safeRequest(() => integrationService.listIntegrations(), []),
    [APP_QUERY_KEYS.documents]: async () => safeRequest(() => documentService.listDocuments(), []),
    [APP_QUERY_KEYS.role]: async () => safeRequest(() => controlService.getRole(), { role: currentUser?.role || role || "VIEWER" }),
    [APP_QUERY_KEYS.permissions]: async () => safeRequest(() => controlService.getPermissions(), { permissions: { VIEWER: {} as any, EDITOR: {} as any, ADMIN: {} as any } }),
    [APP_QUERY_KEYS.timers]: async () => safeRequest(() => timerService.listTimers(), []),
    [APP_QUERY_KEYS.contacts]: async () => safeRequest(() => contactService.listContacts(), []),
    [APP_QUERY_KEYS.tasks]: async () => safeRequest(() => taskService.listTasks(), []),
    [APP_QUERY_KEYS.auditTrail]: async () => safeRequest(() => apiClient.get("/audit"), []),
    [APP_QUERY_KEYS.auditVerification]: async () => safeRequest(() => apiClient.get("/audit/verify"), null),
    [APP_QUERY_KEYS.storageMeta]: async () => safeRequest(() => apiClient.get("/meta/storage"), null),
    [APP_QUERY_KEYS.governanceOverview]: async () => safeRequest(() => apiClient.get("/governance/overview"), null),
    [APP_QUERY_KEYS.governanceArtifacts]: async () => safeRequest(() => apiClient.get("/governance/artifacts"), null),
    [APP_QUERY_KEYS.governancePolicies]: async () => safeRequest(() => apiClient.get("/governance/policies"), null),
    [APP_QUERY_KEYS.health]: async () => safeRequest(() => diagnosticsService.getHealth(), null),
    [APP_QUERY_KEYS.readiness]: async () => safeRequest(() => diagnosticsService.getReadiness(), null),
    [APP_QUERY_KEYS.metrics]: async () => safeRequest(() => diagnosticsService.getMetrics(), null),
    [APP_QUERY_KEYS.diagnostics]: async () => safeRequest(() => diagnosticsService.getDiagnostics(), null),
    [APP_QUERY_KEYS.users]: async () => {
      if ((currentUser?.role || role) !== "ADMIN") return [];
      const payload = await safeRequest(() => authService.listUsers(), { users: [] });
      return payload.users || [];
    },
  };
}

export function applyQueryResult(key: string, value: unknown, setters: QuerySetterMap): unknown {
  const handlers: QuerySetterMap = {
    [APP_QUERY_KEYS.currentUser]: setters.setCurrentUser,
    [APP_QUERY_KEYS.settings]: setters.setSettings,
    [APP_QUERY_KEYS.rules]: setters.setDeadlineRules,
    [APP_QUERY_KEYS.integrations]: setters.setIntegrations,
    [APP_QUERY_KEYS.documents]: setters.setDocuments,
    [APP_QUERY_KEYS.role]: (data) => setters.setRole((data as { role?: string } | null)?.role || "VIEWER"),
    [APP_QUERY_KEYS.permissions]: (data) => setters.setPermissions(normalizePermissionsMatrix(((data as { permissions?: Record<string, boolean> } | null)?.permissions || { VIEWER: {} as any, EDITOR: {} as any, ADMIN: {} as any }) as any)),
    [APP_QUERY_KEYS.timers]: setters.setTimers,
    [APP_QUERY_KEYS.contacts]: setters.setContacts,
    [APP_QUERY_KEYS.tasks]: setters.setTasks,
    [APP_QUERY_KEYS.auditTrail]: (data) => setters.setAuditTrail([...(Array.isArray(data) ? data : [])].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())),
    [APP_QUERY_KEYS.auditVerification]: setters.setAuditVerification,
    [APP_QUERY_KEYS.storageMeta]: setters.setStorageMeta,
    [APP_QUERY_KEYS.governanceOverview]: setters.setGovernanceOverview,
    [APP_QUERY_KEYS.governanceArtifacts]: setters.setGovernanceArtifacts,
    [APP_QUERY_KEYS.governancePolicies]: setters.setGovernancePolicies,
    [APP_QUERY_KEYS.health]: setters.setHealth,
    [APP_QUERY_KEYS.readiness]: setters.setReadiness,
    [APP_QUERY_KEYS.metrics]: setters.setMetrics,
    [APP_QUERY_KEYS.diagnostics]: setters.setDiagnostics,
    [APP_QUERY_KEYS.users]: setters.setUsers,
  };

  handlers[key]?.(value as never);
  return value;
}

export const QUERY_REFRESH_GROUPS = {
  auth: [APP_QUERY_KEYS.currentUser, APP_QUERY_KEYS.diagnostics, APP_QUERY_KEYS.auditTrail],
  settings: [APP_QUERY_KEYS.settings, APP_QUERY_KEYS.health, APP_QUERY_KEYS.readiness, APP_QUERY_KEYS.diagnostics, APP_QUERY_KEYS.auditTrail],
  contacts: [APP_QUERY_KEYS.contacts, APP_QUERY_KEYS.auditTrail],
  tasks: [APP_QUERY_KEYS.tasks, APP_QUERY_KEYS.auditTrail],
  integrations: [APP_QUERY_KEYS.integrations, APP_QUERY_KEYS.auditTrail, APP_QUERY_KEYS.diagnostics, APP_QUERY_KEYS.health, APP_QUERY_KEYS.readiness],
  documents: [APP_QUERY_KEYS.documents, APP_QUERY_KEYS.tasks, APP_QUERY_KEYS.auditTrail, APP_QUERY_KEYS.storageMeta, APP_QUERY_KEYS.governanceArtifacts, APP_QUERY_KEYS.governanceOverview],
  documentArchive: [APP_QUERY_KEYS.documents, APP_QUERY_KEYS.auditTrail, APP_QUERY_KEYS.storageMeta],
  permissions: [APP_QUERY_KEYS.permissions, APP_QUERY_KEYS.auditTrail, APP_QUERY_KEYS.users],
  users: [APP_QUERY_KEYS.users, APP_QUERY_KEYS.auditTrail, APP_QUERY_KEYS.diagnostics],
  timers: [APP_QUERY_KEYS.timers, APP_QUERY_KEYS.auditTrail],
  governance: [APP_QUERY_KEYS.governanceOverview, APP_QUERY_KEYS.governanceArtifacts, APP_QUERY_KEYS.governancePolicies, APP_QUERY_KEYS.auditTrail],
  diagnostics: [APP_QUERY_KEYS.health, APP_QUERY_KEYS.readiness, APP_QUERY_KEYS.metrics, APP_QUERY_KEYS.diagnostics, APP_QUERY_KEYS.auditTrail],
  packets: [APP_QUERY_KEYS.governanceOverview, APP_QUERY_KEYS.governanceArtifacts, APP_QUERY_KEYS.auditTrail, APP_QUERY_KEYS.storageMeta],
} as const;
