import { useMemo, useState } from "react";
import type { AuditRecord, AuthUser, ContactRecord, DocumentRecord, GovernanceArtifacts, GovernanceOverview, GovernanceSettings, PermissionMatrix, QuerySetterMap, TimerRecord } from "../../models/types";

export function useGovernanceState() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [settings, setSettings] = useState<GovernanceSettings | null>(null);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [tasks, setTasks] = useState<Array<Record<string, unknown>>>([]);
  const [deadlineRules, setDeadlineRules] = useState<Array<Record<string, unknown>>>([]);
  const [integrations, setIntegrations] = useState<Array<Record<string, unknown>>>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [role, setRole] = useState("VIEWER");
  const [permissions, setPermissions] = useState<PermissionMatrix>({} as PermissionMatrix);
  const [timers, setTimers] = useState<TimerRecord[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditRecord[]>([]);
  const [auditVerification, setAuditVerification] = useState<Record<string, unknown> | null>(null);
  const [storageMeta, setStorageMeta] = useState<Record<string, unknown> | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [governanceOverview, setGovernanceOverview] = useState<GovernanceOverview | null>(null);
  const [governanceArtifacts, setGovernanceArtifacts] = useState<GovernanceArtifacts | null>(null);
  const [governancePolicies, setGovernancePolicies] = useState<Record<string, unknown> | null>(null);
  const [pendingMfaChallenge, setPendingMfaChallenge] = useState<Record<string, unknown> | null>(null);
  const [mfaSetup, setMfaSetup] = useState<Record<string, unknown> | null>(null);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [readiness, setReadiness] = useState<Record<string, unknown> | null>(null);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [diagnostics, setDiagnostics] = useState<Record<string, unknown> | null>(null);

  const setters = useMemo<QuerySetterMap>(
    () => ({
      setCurrentUser,
      setSettings,
      setContacts,
      setTasks,
      setDeadlineRules,
      setIntegrations,
      setDocuments,
      setRole,
      setPermissions,
      setTimers,
      setAuditTrail,
      setAuditVerification,
      setStorageMeta,
      setUsers,
      setGovernanceOverview,
      setGovernanceArtifacts,
      setGovernancePolicies,
      setHealth,
      setReadiness,
      setMetrics,
      setDiagnostics,
    }),
    [],
  );

  return {
    state: {
      bootstrapped,
      authChecked,
      needsBootstrap,
      isAuthenticated,
      currentUser,
      settings,
      contacts,
      tasks,
      deadlineRules,
      integrations,
      documents,
      role,
      permissions,
      timers,
      auditTrail,
      auditVerification,
      storageMeta,
      users,
      governanceOverview,
      governanceArtifacts,
      governancePolicies,
      pendingMfaChallenge,
      mfaSetup,
      health,
      readiness,
      metrics,
      diagnostics,
    },
    setters,
    actions: {
      setBootstrapped,
      setAuthChecked,
      setNeedsBootstrap,
      setIsAuthenticated,
      setCurrentUser,
      setPendingMfaChallenge,
      setMfaSetup,
    },
  };
}
