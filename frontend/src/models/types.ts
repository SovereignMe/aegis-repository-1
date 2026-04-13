import type { PermissionAction, PermissionMatrix as SharedPermissionMatrix, UserRole } from "@trust-governance/shared/permissions";

export type AppRole = UserRole | string;

export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export interface JsonObject { [key: string]: JsonValue | undefined }

export interface ApiError extends Error {
  status?: number;
  payload?: unknown;
}

export interface ApiClientRequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

export interface AuthUser {
  id?: string;
  email?: string;
  role?: AppRole;
  policyGovernance?: GovernancePolicyState | null;
  [key: string]: unknown;
}

export interface AuthResponse {
  token?: string;
  user?: AuthUser | null;
  users?: AuthUser[];
  requiresMfa?: boolean;
  challengeToken?: string;
  challengeMethod?: string;
  challengeExpiresInSeconds?: number;
  challengeUser?: { email?: string; fullName?: string; [key: string]: unknown };
  [key: string]: unknown;
}

export interface GovernanceSettings {
  trust?: {
    jurisdiction?: string;
    trustName?: string;
    trustCode?: string;
    instrumentMetadata?: {
      controllingInstrumentName?: string;
      controllingInstrumentDate?: string;
      governingInstrumentIds?: string[];
      repositoryPrefix?: string;
      recordClassification?: string;
      [key: string]: unknown;
    };
    jurisdictionProfile?: {
      primaryJurisdiction?: string;
      filingVenue?: string;
      governingLawMode?: string;
      hintPackKey?: string;
      [key: string]: unknown;
    };
    fiduciaryRoles?: {
      trustee?: string;
      successorTrustee?: string;
      trustProtector?: string;
      distributionCommittee?: string;
      recordsOfficer?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  approvals?: {
    reasonCodes?: string[];
    policy?: {
      makerChecker?: boolean;
      packetRequiredApprovals?: number;
      distributionThresholdAmount?: number;
      distributionThresholdApprovals?: number;
      policyActivationApprovals?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  recordsGovernance?: { immutableArchiveTier?: string; [key: string]: any };
  platformBoundary?: {
    mode?: string;
    supportScope?: string;
    legalAdjudicationEnabled?: boolean;
    disclaimerVersion?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ContactRecord {
  id?: string;
  fullName?: string;
  status?: string;
  organization?: string;
  email?: string;
  phone?: string;
  faxNumber?: string;
  country?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateRegion?: string;
  postalCode?: string;
  [key: string]: unknown;
}

export interface TaskRecord { id?: string; title?: string; status?: string; [key: string]: any }
export interface TimerRecord { id?: string; stoppedAt?: string | null; [key: string]: any }
export interface AuditRecord { id?: string; createdAt?: string; [key: string]: any }
export interface DocumentRecord { id?: string; title?: string; displayId?: string; exhibitCode?: string; [key: string]: any }
export interface BeneficiaryRecord { id?: string; fullName?: string; [key: string]: any }
export interface DistributionRecord { id?: string; status?: string; requestCode?: string; [key: string]: any }
export interface NoticeRecord { id?: string; status?: string; noticeCode?: string; [key: string]: any }
export interface PacketRecord { id?: string; status?: string; [key: string]: any }
export interface GovernancePolicyVersionRecord { id?: string; policyType?: string; title?: string; version?: number; status?: string; historyHash?: string; signature?: string; createdAt?: string; createdBy?: string; content?: Record<string, any>; [key: string]: any }
export interface GovernancePolicyState { activeVersionIds?: Record<string,string>; versions?: GovernancePolicyVersionRecord[]; jurisdictionHintPackDefaults?: Record<string,string[]>; [key: string]: any }

export interface GovernanceOverview {
  controllingDocument?: DocumentRecord | null;
  counts?: Record<string, number>;
  orphanDocuments?: DocumentRecord[];
  invalidAuthority?: Array<Record<string, any>>;
  pendingNotices?: NoticeRecord[];
  pendingDistributions?: DistributionRecord[];
  complianceEngine?: GovernanceComplianceEngine | null;
  [key: string]: unknown;
}

export interface GovernanceArtifacts {
  beneficiaries?: BeneficiaryRecord[];
  distributions?: DistributionRecord[];
  notices?: NoticeRecord[];
  packets?: PacketRecord[];
  policyVersions?: GovernancePolicyVersionRecord[];
  policyGovernance?: GovernancePolicyState | null;
  trustLedgerEntries?: Array<Record<string, any>>;
  [key: string]: unknown;
}

export interface GovernanceComplianceCheckpoint {
  key: string;
  label: string;
  status?: string;
  detail?: string;
}

export interface GovernanceComplianceIssue {
  severity?: string;
  area?: string;
  message: string;
}

export interface GovernanceComplianceEngine {
  score?: number;
  summary?: string;
  status?: string;
  counts?: { failed?: number; warnings?: number; passed?: number; [key: string]: number | undefined };
  checkpoints?: GovernanceComplianceCheckpoint[];
  issues?: GovernanceComplianceIssue[];
  [key: string]: unknown;
}


export interface VerificationChecklistItem {
  code: string;
  status?: string;
  detail?: string;
}

export interface VerificationReport {
  reportId?: string;
  reportHash?: string;
  exportName?: string;
  generatedAt?: string;
  verifierVersion?: string;
  trustId?: string;
  document?: DocumentRecord;
  verification?: Record<string, any>;
  operatorChecklist?: VerificationChecklistItem[];
  supportBoundary?: string;
  [key: string]: unknown;
}


export interface GovernanceWorkspacePagePayload {
  page: string;
  title?: string;
  summary?: string;
  records?: DocumentRecord[];
  notices?: NoticeRecord[];
  beneficiaries?: BeneficiaryRecord[];
  ledgers?: Array<Record<string, any>>;
  ledgerEntries?: Array<Record<string, any>>;
  accountingEntries?: Array<Record<string, any>>;
  packets?: PacketRecord[];
  approvals?: Array<Record<string, any>>;
  distributions?: DistributionRecord[];
  policyVersions?: GovernancePolicyVersionRecord[];
  policyGovernance?: GovernancePolicyState | null;
  authorityChain?: Array<Record<string, any>>;
  exhibitIndex?: Array<Record<string, any>>;
  verification?: Record<string, any> | null;
  issues?: GovernanceComplianceIssue[];
  metrics?: Record<string, number>;
  [key: string]: unknown;
}

export interface GovernancePanelProps {
  settings: GovernanceSettings | null;
  overview: GovernanceOverview | null;
  artifacts: GovernanceArtifacts | null;
  documents: DocumentRecord[];
  canWrite: boolean;
  canDistribute: boolean;
  canNotice: boolean;
  canPacket: boolean;
  onCreateBeneficiary: (payload: Record<string, any>) => Promise<unknown> | unknown;
  onRequestDistribution: (payload: Record<string, any>) => Promise<unknown> | unknown;
  onApproveDistribution: (id: string, payload: Record<string, any>) => Promise<unknown> | unknown;
  onCreateNotice: (payload: Record<string, any>) => Promise<unknown> | unknown;
  onServeNotice: (id: string, payload?: Record<string, any>) => Promise<unknown> | unknown;
  onBuildPacket: (payload: Record<string, any>) => Promise<unknown> | unknown;
  onCreatePolicyVersion?: (payload: Record<string, any>) => Promise<unknown> | unknown;
  onActivatePolicyVersion?: (policyType: string, versionId: string) => Promise<unknown> | unknown;
}

export interface QueryFactoryMap { [key: string]: () => Promise<unknown> }
export interface QuerySetterMap { [key: string]: (value: any) => void }
export type PermissionMatrix = SharedPermissionMatrix;
export type PermissionKey = PermissionAction;
