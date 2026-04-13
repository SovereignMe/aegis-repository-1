import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { env } from "../config/env.js";
import { DEFAULT_PERMISSION_MATRIX, normalizePermissionsMatrix } from "../../../shared/src/permissions.js";
import { isIntegrationAvailable } from "../config/integrations.js";
import { loadAuthSessionState, persistAuthSessionState } from "./persistence/authSessionPersistence.js";
import { loadAuditState, persistAuditState } from "./persistence/auditPersistence.js";
import { loadDocumentRepositoryState, persistDocumentRepositoryState } from "./persistence/documentRepositoryPersistence.js";
import { loadStateFromFile, persistStateToFile } from "./persistence/fileStatePersistence.js";
import { loadGovernanceState, persistGovernanceState } from "./persistence/governancePersistence.js";
import { loadSettingsConfigState, persistSettingsConfigState } from "./persistence/settingsConfigPersistence.js";
import { applyStateSlices, exportStateSlices } from "./persistence/stateSlices.js";
import { createAuditRecord, verifyAuditEntries } from "./store/audit-chain.js";
import { runPostgresMigrations } from "./store/postgres-migrations.js";
import type {
  DocumentRecord,
  ExhibitIndexRecord,
  GovernanceState,
  IntegrationRecord,
  RefreshSession,
  StorageMeta,
  TenantRecord,
  TrustLedgerRecord,
  TrustLedgerEntryRecord,
  TrustRecord,
  AuthorityChainRecord,
  BeneficiaryRecord,
} from "../models/domain.js";


export const LOCAL_TENANT_ID = "hlh-tenant";
export const LOCAL_TRUST_ID = "local-trust";

const DefaultPermissionMatrixLocal = DEFAULT_PERMISSION_MATRIX;

function nowIso() {
  return new Date().toISOString();
}

const DefaultSettings = {
  app: {
    mode: "secure-multi-user",
    timezone: "America/Chicago",
    theme: "dark",
    defaultDeadlinePreset: 15,
    businessDayMode: "calendar",
    clockMode: "local",
  },
  trust: {
    trustCode: "HLH-FIT",
    trustName: "HLH FUTURE INVESTMENT TRUST",
    jurisdiction: "PRIVATE",
    instrumentMetadata: {
      controllingInstrumentName: "Controlling Supplemental Trust Indenture",
      controllingInstrumentDate: "2025-03-03",
      governingInstrumentIds: ["HLH-GOV-20260329-001"],
      repositoryPrefix: "HLH-GOV",
      recordClassification: "administrative-governance",
    },
    jurisdictionProfile: {
      primaryJurisdiction: "PRIVATE",
      filingVenue: "Administrative / private trust records",
      governingLawMode: "trust-instrument-first",
      hintPackKey: "PRIVATE",
    },
    fiduciaryRoles: {
      trustee: "Henry-Lee: Hunter, Trustee",
      successorTrustee: "Unassigned",
      trustProtector: "Unassigned",
      distributionCommittee: "Trustee approval committee",
      recordsOfficer: "Trust repository administrator",
    },
  },
  notifications: {
    desktop: true,
    reminderLeadMinutes: [60, 1440],
  },
  security: {
    sessionTtlHours: 12,
    uploadStorage: "local-durable",
    auditMode: "hash-chained",
    allowSelfRegistration: false,
    selfRegistrationRole: "VIEWER",
    passwordMinLength: 14,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSymbol: true,
    breachedPasswordScreening: true,
    requireAdminMfa: true,
    maxFailedLoginAttempts: 5,
    lockoutMinutes: 15,
    disableAfterLockouts: 3,
    auditAlertsEnabled: true,
    sessionSigning: {
      activeKeyId: "local-k1",
      keys: {
        "local-k1": { secret: env.sessionSecret, createdAt: "2026-03-29T00:00:00.000Z", status: "active" },
      },
      lastRotatedAt: "2026-03-29T00:00:00.000Z",
    },
  },
  approvals: {
    enabled: true,
    makerChecker: true,
    roleSeparatedAuthorization: true,
    mandatoryNotes: true,
    mandatoryReasonCodes: true,
    distributions: {
      enabled: true,
      baseRequiredApprovals: 1,
      thresholdAmount: 5000,
      thresholdRequiredApprovals: 2,
    },
    packets: {
      enabled: true,
      baseRequiredApprovals: 1,
      evidencePackageRequiredApprovals: 2,
    },
    policy: {
      makerChecker: true,
      packetRequiredApprovals: 2,
      distributionThresholdAmount: 5000,
      distributionThresholdApprovals: 2,
      policyActivationApprovals: 2,
    },
    reasonCodes: ["BENEFICIARY_SUPPORT", "EDUCATION", "MEDICAL", "ADMIN_RECORD", "EVIDENCE_EXPORT", "LITIGATION", "OTHER"],
  },
  platformBoundary: {
    mode: "administrative-governance-and-evidence-control",
    supportScope: "Supports administrative governance, records control, packet assembly, and evidence preservation only.",
    legalAdjudicationEnabled: false,
    disclaimerVersion: "2026-04-boundary-1",
  },
  recordsGovernance: {
    legalHoldEnabled: true,
    immutableArchiveTier: "immutable-worm",
    defaultRetentionTrigger: "effective-date",
    exportWatermarkTemplate: "HLH FUTURE INVESTMENT TRUST | GOVERNED COPY | {displayId} | {packetCode} | {generatedAt}",
    checksumAlgorithm: "sha256",
    trustedTimestamp: {
      provider: env.evidenceTimestampProvider,
      enabled: true,
      mode: env.evidenceTimestampMode,
      authorityUrl: env.evidenceTimestampAuthorityUrl || null,
    },
    manifestSigning: {
      algorithm: "Ed25519",
      activeKeyId: env.evidenceSigningKeyId,
      keyStore: env.evidenceSigningKeyStore,
      keys: {
        [env.evidenceSigningKeyId]: { publicKeyFingerprint: "managed-at-runtime", createdAt: "2026-04-02T00:00:00.000Z", status: "active", signerIdentity: env.evidenceSignerIdentity },
      },
      rotation: { recommendedDays: 90, nextRotationReviewAt: null, procedure: "Provision new external key pair, publish verifier metadata, flip activeKeyId, and retain prior public keys through the bundle verification window." },
    },
    retentionSchedules: {
      governing: { code: "PERMANENT", label: "Permanent", years: null, archiveTier: "immutable-worm" },
      perfection: { code: "PERMANENT", label: "Permanent", years: null, archiveTier: "immutable-worm" },
      accounting: { code: "TRUST-7Y", label: "Trust accounting 7 years", years: 7, archiveTier: "immutable-worm" },
      correspondence: { code: "ADMIN-5Y", label: "Administrative 5 years", years: 5, archiveTier: "standard" },
      notice: { code: "NOTICE-10Y", label: "Notice record 10 years", years: 10, archiveTier: "immutable-worm" },
      default: { code: "ADMIN-5Y", label: "Administrative 5 years", years: 5, archiveTier: "standard" },
    },
  },
  compliance: {
    engineEnabled: true,
    requiredLedgerCodes: ["ML-001", "DX-001", "AL-001"],
    requireControllingInstrument: true,
    requireAuditVerification: true,
    requireMetadataSignatures: true,
    blockQuarantinedUploads: true,
    recommendDocumentTypes: ["governing", "perfection", "accounting", "notice"],
  },
};

const DefaultDeadlineRules = [
  { code: "D3", name: "3 Day", defaultDays: 3, businessDayMode: "calendar", isSystem: true },
  { code: "D7", name: "7 Day", defaultDays: 7, businessDayMode: "calendar", isSystem: true },
  { code: "D10", name: "10 Day", defaultDays: 10, businessDayMode: "calendar", isSystem: true },
  { code: "D15", name: "15 Day", defaultDays: 15, businessDayMode: "calendar", isSystem: true },
  { code: "D30", name: "30 Day", defaultDays: 30, businessDayMode: "calendar", isSystem: true },
  { code: "D45", name: "45 Day", defaultDays: 45, businessDayMode: "calendar", isSystem: true },
  { code: "D60", name: "60 Day", defaultDays: 60, businessDayMode: "calendar", isSystem: true },
  { code: "CUSTOM", name: "Custom", defaultDays: null, businessDayMode: "calendar", isSystem: true },
];

const DefaultTenants: TenantRecord[] = [
  { id: LOCAL_TENANT_ID, code: "HLH", name: "HLH Administrative Tenant", status: "active" as const, createdAt: "2026-03-29T00:00:00.000Z", updatedAt: "2026-03-29T00:00:00.000Z" },
];

const DefaultTrusts: TrustRecord[] = [
  { id: LOCAL_TRUST_ID, tenantId: LOCAL_TENANT_ID, trustCode: "HLH-FIT", trustName: "HLH FUTURE INVESTMENT TRUST", jurisdiction: "PRIVATE", status: "active" as const, createdAt: "2026-03-29T00:00:00.000Z", updatedAt: "2026-03-29T00:00:00.000Z" },
];

const DefaultIntegrations: IntegrationRecord[] = [
  { id: "gmail", provider: "gmail", status: "placeholder", syncMode: "manual", capabilities: ["drafts", "threads", "contacts-linking"] },
  { id: "google-calendar", provider: "googleCalendar", status: "placeholder", syncMode: "manual", capabilities: ["events", "deadline-sync", "reminders"] },
  { id: "cloud-sync", provider: "cloudSync", status: "placeholder", syncMode: "manual", capabilities: ["backup", "multi-device", "conflict-resolution"] },
];

const DefaultDocuments: DocumentRecord[] = [
  { id: "2af9187d-c8f1-4cef-8a1e-6470d7db631c", trustId: LOCAL_TRUST_ID, systemId: "sys-doc-001", displayId: "HLH-GOV-20260329-001", title: "MASTER TRUST INDENTURE", exhibitCode: "EXHIBIT A", docType: "governing", category: "governance", status: "active", jurisdiction: "PRIVATE", governingLevel: "controlling", sourceType: "manual", summary: "Foundational governing instrument for trust administration.", notes: "Primary source authority for trust structure, administration, and internal governance alignment.", effectiveDate: "2026-03-29", createdAt: "2026-03-29T00:00:00.000Z", updatedAt: "2026-03-29T00:00:00.000Z", immutable: true, deletedAt: null, deletedBy: null, ledgerIds: ["ML-001", "DX-001"], tags: ["GOVERNING", "PRIVATE", "ACTIVE"], fileName: null, originalFileName: null, mimeType: null, fileSize: null, fileHash: null, storagePath: null },
  { id: "e32c81dd-b3b6-4765-8555-a8dc4d98845d", trustId: LOCAL_TRUST_ID, systemId: "sys-doc-002", displayId: "HLH-PER-20260329-002", title: "UCC-1 FILING", exhibitCode: "EXHIBIT B", docType: "perfection", category: "public-notice", status: "recorded", jurisdiction: "PUBLIC NOTICE", governingLevel: "supporting", sourceType: "manual", summary: "Public perfection and notice filing associated with trust collateral position.", notes: "Supports public notice and constructive record alignment for secured administrative posture.", effectiveDate: "2026-03-29", createdAt: "2026-03-29T00:00:00.000Z", updatedAt: "2026-03-29T00:00:00.000Z", immutable: true, deletedAt: null, deletedBy: null, ledgerIds: ["ML-001", "DX-001"], tags: ["PERFECTION", "PUBLIC NOTICE", "RECORDED"], fileName: null, originalFileName: null, mimeType: null, fileSize: null, fileHash: null, storagePath: null },
];

function seedTrustLedgers(): TrustLedgerRecord[] {
  const createdAt = "2026-03-29T00:00:00.000Z";
  return [
    { id: "ledger-ml-001", trustId: LOCAL_TRUST_ID, ledgerCode: "ML-001", ledgerType: "master-trust-ledger", name: "MASTER TRUST LEDGER", description: "Primary governance ledger for trust instruments and resolutions.", immutable: true, deletedAt: null, createdAt, updatedAt: createdAt },
    { id: "ledger-dx-001", trustId: LOCAL_TRUST_ID, ledgerCode: "DX-001", ledgerType: "master-document-exhibit-index", name: "MASTER DOCUMENT EXHIBIT INDEX", description: "Cross-reference ledger for exhibits and repository records.", immutable: true, deletedAt: null, createdAt, updatedAt: createdAt },
    { id: "ledger-al-001", trustId: LOCAL_TRUST_ID, ledgerCode: "AL-001", ledgerType: "master-accounting-ledger", name: "MASTER TRUST ACCOUNTING LEDGER", description: "Accounting ledger for trust administration and remittance records.", immutable: true, deletedAt: null, createdAt, updatedAt: createdAt },
  ];
}

function seedExhibitIndex(documents: DocumentRecord[]): ExhibitIndexRecord[] {
  return documents.map((document, index) => ({
    id: `exhibit-${document.id}`,
    trustId: document.trustId,
    documentId: document.id,
    exhibitCode: document.exhibitCode,
    sequenceNumber: index + 1,
    label: document.title,
    immutable: Boolean(document.immutable),
    deletedAt: document.deletedAt || null,
    createdAt: document.createdAt || document.updatedAt,
    updatedAt: document.updatedAt,
  }));
}


function seedBeneficiaries(): BeneficiaryRecord[] {
  const createdAt = "2026-03-29T00:00:00.000Z";
  return [
    { id: "bene-001", trustId: LOCAL_TRUST_ID, beneficiaryCode: "BEN-001", fullName: "Primary Beneficiary", beneficiaryType: "individual", status: "active", allocationPercent: 100, notes: "Seed beneficiary for workflow controls.", immutable: false, deletedAt: null, createdAt, updatedAt: createdAt },
  ];
}

function seedTrustLedgerEntries(documents: DocumentRecord[], exhibits: ExhibitIndexRecord[]): TrustLedgerEntryRecord[] {
  return documents.map((document, index) => ({
    id: `tle-${document.id}`,
    trustId: document.trustId,
    ledgerId: document.docType === "accounting" ? "ledger-al-001" : "ledger-ml-001",
    entryCode: `MTL-${String(index + 1).padStart(4, "0")}`,
    entryType: document.docType,
    documentId: document.id,
    exhibitId: exhibits[index]?.id || null,
    title: document.title,
    description: document.summary,
    effectiveDate: document.effectiveDate,
    postedAt: document.updatedAt,
    immutable: Boolean(document.immutable),
    deletedAt: document.deletedAt || null,
    metadata: { displayId: document.displayId, governingLevel: document.governingLevel },
  }));
}

function seedAuthorityChain(documents: DocumentRecord[]): AuthorityChainRecord[] {
  const controlling = documents.find((document) => document.governingLevel === "controlling") || documents[0];
  return documents.map((document) => ({
    id: `auth-${document.id}`,
    trustId: document.trustId,
    documentId: document.id,
    authorityType: document.docType === "governing" ? "governing-instrument" : "supporting-instrument",
    parentDocumentId: document.id === controlling?.id ? null : controlling?.id || null,
    status: document.id === controlling?.id || document.docType !== "governing" ? "valid" : "warning",
    validatedAt: document.updatedAt,
    notes: document.id === controlling?.id ? "Controlling governing instrument." : "Authority derived from controlling governing instrument.",
  }));
}

function makeDefaultState(): GovernanceState {
  const documents = structuredClone(DefaultDocuments);
  const exhibitIndex = seedExhibitIndex(documents);
  return {
    tenants: structuredClone(DefaultTenants),
    trusts: structuredClone(DefaultTrusts),
    settings: structuredClone(DefaultSettings),
    deadlineRules: structuredClone(DefaultDeadlineRules),
    integrations: structuredClone(DefaultIntegrations),
    documents,
    contacts: [],
    tasks: [],
    role: "ADMIN",
    permissions: structuredClone(DefaultPermissionMatrixLocal),
    timers: [],
    audit: [],
    users: [],
    sessions: [],
    trustLedgers: seedTrustLedgers(),
    exhibitIndex,
    trustLedgerEntries: seedTrustLedgerEntries(documents, exhibitIndex),
    accountingEntries: [],
    authorityChain: seedAuthorityChain(documents),
    beneficiaries: seedBeneficiaries(),
    distributions: [],
    notices: [],
    packets: [],
    approvals: [],
    policyVersions: [],
  };
}

function normalizeState(input: Partial<GovernanceState> | null | undefined): GovernanceState {
  const base = makeDefaultState();
  const documents = Array.isArray(input?.documents) ? structuredClone(input.documents) : base.documents;
  const tenants = Array.isArray(input?.tenants) && input.tenants.length ? structuredClone(input.tenants) : structuredClone(base.tenants || []);
  const inferredTrusts = documents
    .filter((document) => document?.trustId)
    .map((document) => ({
      id: String(document.trustId),
      tenantId: LOCAL_TENANT_ID,
      trustCode: (document.displayId || String(document.trustId)).toUpperCase(),
      trustName: document.title || String(document.trustId),
      jurisdiction: document.jurisdiction || "PRIVATE",
      status: "active" as const,
      createdAt: document.createdAt || document.updatedAt || nowIso(),
      updatedAt: document.updatedAt || document.createdAt || nowIso(),
    }));
  const trusts = Array.isArray(input?.trusts) && input.trusts.length
    ? structuredClone(input.trusts)
    : [...new Map([...(base.trusts || []), ...inferredTrusts].map((trust) => [trust.id, trust])).values()];
  return {
    tenants,
    trusts,
    settings: {
      ...structuredClone(base.settings),
      ...(input?.settings ? structuredClone(input.settings) : {}),
      app: { ...(structuredClone(base.settings.app) as Record<string, unknown>), ...((input?.settings as any)?.app || {}) },
      trust: { ...(structuredClone(base.settings.trust) as Record<string, unknown>), ...((input?.settings as any)?.trust || {}) },
      notifications: { ...(structuredClone(base.settings.notifications) as Record<string, unknown>), ...((input?.settings as any)?.notifications || {}) },
      security: { ...(structuredClone(base.settings.security) as Record<string, unknown>), ...((input?.settings as any)?.security || {}) },
      approvals: {
        ...(structuredClone((base.settings as any).approvals || {}) as Record<string, unknown>),
        ...((input?.settings as any)?.approvals || {}),
        distributions: { ...(((base.settings as any).approvals?.distributions || {}) as Record<string, unknown>), ...(((input?.settings as any)?.approvals?.distributions) || {}) },
        packets: { ...(((base.settings as any).approvals?.packets || {}) as Record<string, unknown>), ...(((input?.settings as any)?.approvals?.packets) || {}) },
      },
      recordsGovernance: {
        ...(structuredClone((base.settings as any).recordsGovernance || {}) as Record<string, unknown>),
        ...((input?.settings as any)?.recordsGovernance || {}),
        trustedTimestamp: { ...((((base.settings as any).recordsGovernance?.trustedTimestamp) || {}) as Record<string, unknown>), ...((((input?.settings as any)?.recordsGovernance?.trustedTimestamp) || {})) },
        manifestSigning: { ...((((base.settings as any).recordsGovernance?.manifestSigning) || {}) as Record<string, unknown>), ...((((input?.settings as any)?.recordsGovernance?.manifestSigning) || {})) },
        retentionSchedules: { ...((((base.settings as any).recordsGovernance?.retentionSchedules) || {}) as Record<string, unknown>), ...((((input?.settings as any)?.recordsGovernance?.retentionSchedules) || {})) },
      },
      compliance: { ...(structuredClone((base.settings as any).compliance || {}) as Record<string, unknown>), ...((input?.settings as any)?.compliance || {}) },
      policyGovernance: {
        ...(structuredClone((base.settings as any).policyGovernance || {}) as Record<string, unknown>),
        ...((input?.settings as any)?.policyGovernance || {}),
        activeVersionIds: { ...((((base.settings as any).policyGovernance?.activeVersionIds) || {}) as Record<string, unknown>), ...((((input?.settings as any)?.policyGovernance?.activeVersionIds) || {})) },
        jurisdictionHintPackDefaults: { ...((((base.settings as any).policyGovernance?.jurisdictionHintPackDefaults) || {}) as Record<string, unknown>), ...((((input?.settings as any)?.policyGovernance?.jurisdictionHintPackDefaults) || {})) },
        versionHistory: Array.isArray((input?.settings as any)?.policyGovernance?.versionHistory) ? structuredClone(((input?.settings as any).policyGovernance.versionHistory)) : structuredClone((((base.settings as any).policyGovernance?.versionHistory) || [])),
      },
    },
    deadlineRules: Array.isArray(input?.deadlineRules) ? structuredClone(input.deadlineRules) : base.deadlineRules,
    integrations: Array.isArray(input?.integrations) ? structuredClone(input.integrations).filter((item) => isIntegrationAvailable(item.provider) && item.status !== "placeholder") : base.integrations,
    documents,
    contacts: Array.isArray(input?.contacts) ? structuredClone(input.contacts) : base.contacts,
    tasks: Array.isArray(input?.tasks) ? structuredClone(input.tasks) : base.tasks,
    role: input?.role || base.role,
    permissions: normalizePermissionsMatrix(input?.permissions as Record<string, Record<string, boolean>> | undefined),
    timers: Array.isArray(input?.timers) ? structuredClone(input.timers) : base.timers,
    audit: Array.isArray(input?.audit) ? structuredClone(input.audit) : base.audit,
    users: Array.isArray(input?.users) ? structuredClone(input.users) : base.users,
    sessions: Array.isArray(input?.sessions) ? structuredClone(input.sessions) : [],
    trustLedgers: Array.isArray(input?.trustLedgers) ? structuredClone(input.trustLedgers) : seedTrustLedgers(),
    exhibitIndex: Array.isArray(input?.exhibitIndex) ? structuredClone(input.exhibitIndex) : seedExhibitIndex(documents),
    trustLedgerEntries: Array.isArray(input?.trustLedgerEntries) ? structuredClone(input.trustLedgerEntries) : seedTrustLedgerEntries(documents, Array.isArray(input?.exhibitIndex) ? structuredClone(input.exhibitIndex) : seedExhibitIndex(documents)),
    accountingEntries: Array.isArray(input?.accountingEntries) ? structuredClone(input.accountingEntries) : [],
    authorityChain: Array.isArray(input?.authorityChain) ? structuredClone(input.authorityChain) : seedAuthorityChain(documents),
    beneficiaries: Array.isArray(input?.beneficiaries) ? structuredClone(input.beneficiaries) : seedBeneficiaries(),
    distributions: Array.isArray(input?.distributions) ? structuredClone(input.distributions) : [],
    notices: Array.isArray(input?.notices) ? structuredClone(input.notices) : [],
    packets: Array.isArray(input?.packets) ? structuredClone(input.packets) : [],
    approvals: Array.isArray(input?.approvals) ? structuredClone(input.approvals) : [],
    policyVersions: Array.isArray((input as any)?.policyVersions) ? structuredClone((input as any).policyVersions) : [],
  };
}

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

class DurableGovernanceStore implements GovernanceState {
  tenants = makeDefaultState().tenants || [];
  trusts = makeDefaultState().trusts || [];
  settings = makeDefaultState().settings;
  deadlineRules = makeDefaultState().deadlineRules;
  integrations = makeDefaultState().integrations;
  documents = makeDefaultState().documents;
  contacts = makeDefaultState().contacts;
  tasks = makeDefaultState().tasks;
  role = makeDefaultState().role;
  permissions = makeDefaultState().permissions;
  timers = makeDefaultState().timers;
  audit = makeDefaultState().audit;
  users = makeDefaultState().users;
  sessions: RefreshSession[] = makeDefaultState().sessions || [];
  trustLedgers = makeDefaultState().trustLedgers || [];
  exhibitIndex = makeDefaultState().exhibitIndex || [];
  trustLedgerEntries = makeDefaultState().trustLedgerEntries || [];
  accountingEntries = makeDefaultState().accountingEntries || [];
  authorityChain = makeDefaultState().authorityChain || [];
  beneficiaries = makeDefaultState().beneficiaries || [];
  distributions = makeDefaultState().distributions || [];
  notices = makeDefaultState().notices || [];
  packets = makeDefaultState().packets || [];
  approvals = makeDefaultState().approvals || [];
  policyVersions = makeDefaultState().policyVersions || [];
  artifactStatuses = makeDefaultState().artifactStatuses || [];
  initialized = false;
  pool: Pool | null = env.databaseUrl ? new Pool({ connectionString: env.databaseUrl, ssl: env.databaseUrl.includes("localhost") ? undefined : { rejectUnauthorized: false } }) : null;
  storageMeta: StorageMeta = {
    mode: this.pool ? "postgres" : (env.isTestMode ? "file" : "postgres"),
    durable: true,
    location: this.pool ? env.databaseUrl : (env.isTestMode ? env.stateFile : "postgres-required"),
    initializedAt: nowIso(),
    lastPersistedAt: null,
  };

  private applyState(state: GovernanceState) {
    applyStateSlices(this, state);
  }

  exportState(): GovernanceState {
    return normalizeState(exportStateSlices(this));
  }

  private async loadFromPostgres(): Promise<GovernanceState | null> {
    if (!this.pool) return null;
    await runPostgresMigrations(this.pool);

    const [settingsConfig, repositoryState, authState, auditState] = await Promise.all([
      loadSettingsConfigState(),
      loadDocumentRepositoryState(this.pool),
      loadAuthSessionState(this.pool),
      loadAuditState(this.pool),
    ] as const);
    const governanceState = await loadGovernanceState(this.pool, (provider) => isIntegrationAvailable(provider as any), repositoryState.documents, repositoryState.exhibitIndex, seedTrustLedgerEntries, seedAuthorityChain, seedBeneficiaries);

    return normalizeState({
      ...governanceState,
      ...settingsConfig,
      ...repositoryState,
      role: "ADMIN",
      ...auditState,
      ...authState,
    });
  }


  async resetForTests(state?: Partial<GovernanceState>) {
    const nextState = normalizeState({ ...makeDefaultState(), ...(state || {}) } as GovernanceState);
    this.applyState(nextState);
    this.initialized = true;
    this.storageMeta = {
      ...this.storageMeta,
      initializedAt: nowIso(),
      lastPersistedAt: null,
    };
    await fs.mkdir(env.dataDir, { recursive: true });
    await fs.mkdir(env.uploadsDir, { recursive: true });
    await fs.mkdir(env.quarantineDir, { recursive: true });
    await fs.mkdir(env.uploadTempDir, { recursive: true });
    await fs.mkdir(env.evidenceBundlesDir, { recursive: true });
    await this.persist("test-reset");
    return this.exportState();
  }

  async init() {
    if (this.initialized) return;
    let loaded: GovernanceState | null = null;
    if (this.pool) {
      loaded = await this.loadFromPostgres();
    } else if (env.isTestMode) {
      loaded = await loadStateFromFile(env.stateFile, normalizeState);
    } else {
      throw new Error("Postgres-backed persistence is required outside isolated test mode.");
    }
    this.applyState(loaded || makeDefaultState());
    this.initialized = true;
    await fs.mkdir(env.uploadsDir, { recursive: true });
    if (!this.audit.length) {
      this.addAudit("BOOTSTRAP_READY", "system", null, null, { startedAt: nowIso(), storageMode: this.storageMeta.mode });
      await this.persist("bootstrap");
    }
  }

  addAudit(action: string, entityType: string, entityId: string | null, before?: unknown, after?: unknown, metadata?: Record<string, unknown>, actor = "SYSTEM") {
    const entry = createAuditRecord(this.audit, action, entityType, entityId, before, after, metadata, actor);
    this.audit.unshift(entry);
    return entry;
  }

  getAuditForTrust(trustId: string) {
    return this.audit.filter((entry) => {
      const candidateTrustId = (entry as any).trustId || (entry.metadata as any)?.trustId || (entry.after as any)?.trustId || (entry.before as any)?.trustId || null;
      return !candidateTrustId || candidateTrustId === trustId;
    });
  }

  verifyAudit(trustId?: string) {
    return verifyAuditEntries(trustId ? this.getAuditForTrust(trustId) : this.audit);
  }

  private async flushPostgresState(client: import("pg").PoolClient, state: GovernanceState) {
    const governanceContext = await persistGovernanceState(client, state, DefaultTenants, DefaultTrusts, LOCAL_TENANT_ID);
    await persistSettingsConfigState(state.settings || {});
    await persistAuthSessionState(client, state, governanceContext.resolveTenantIdForTrust, LOCAL_TRUST_ID);
    await persistDocumentRepositoryState(client, state, governanceContext.resolveTenantIdForTrust, seedExhibitIndex);
    await persistAuditState(client, state.audit, governanceContext.resolveTenantIdForTrust);
  }

  private async persistToPostgres(state: GovernanceState) {
    if (!this.pool) return;
    await runPostgresMigrations(this.pool);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await this.flushPostgresState(client, state);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async persistWithinTransaction(client: import("pg").PoolClient, reason = "mutation") {
    await this.flushPostgresState(client, this.exportState());
    this.storageMeta.lastPersistedAt = nowIso();
    return { ok: true, reason, storage: this.storageMeta };
  }


  async withPersistenceBoundary<T>(reason: string, operation: () => Promise<T> | T) {
    const result = await operation();
    await this.persist(reason);
    return result;
  }

  async persist(reason = "mutation") {
    const state = this.exportState();
    if (this.pool) {
      await this.persistToPostgres(state);
    } else if (env.isTestMode) {
      await persistStateToFile(env.stateFile, state, ensureDir);
    } else {
      throw new Error("DB-only mutation persistence is enforced outside isolated test mode.");
    }
    this.storageMeta.lastPersistedAt = nowIso();
    return { ok: true, reason, storage: this.storageMeta };
  }

  getStorageMeta(): StorageMeta {
    return { ...this.storageMeta };
  }
}

export const db = new DurableGovernanceStore();
