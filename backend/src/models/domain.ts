export interface TenantRecord {
  id: string;
  code: string;
  name: string;
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
}

export interface TrustRecord {
  id: string;
  tenantId: string;
  trustCode: string;
  trustName: string;
  jurisdiction: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationRecord {
  id: string;
  tenantId?: string;
  provider: "gmail" | "googleCalendar" | "cloudSync";
  status: "placeholder" | "configured-local" | "connected" | "error";
  accountEmail?: string;
  connectedAt?: string | null;
  disconnectedAt?: string | null;
  lastSyncAt?: string | null;
  syncMode: "manual" | "scheduled";
  capabilities?: string[];
}

export interface TaskRecord {
  id: string;
  immutable?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  trustId?: string;
  documentId?: string | null;
  contactId?: string | null;
  title: string;
  taskType: string;
  status: string;
  priority?: string;
  triggerDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  assignedTo?: string;
  ruleCode?: string | null;
  customDayValue?: number | null;
  notes?: string;
  reminders?: unknown[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactRecord {
  id: string;
  immutable?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  trustId: string;
  contactType: string;
  fullName: string;
  organization: string;
  email: string;
  phone: string;
  faxNumber?: string;
  status?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  createdAt?: string;
  immutable?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  trustId: string;
  systemId: string;
  displayId: string;
  title: string;
  exhibitCode: string;
  docType: string;
  category: string;
  status: string;
  jurisdiction: string;
  governingLevel: string;
  sourceType: string;
  summary: string;
  notes: string;
  effectiveDate: string;
  updatedAt: string;
  ledgerIds: string[];
  tags: string[];
  fileName?: string | null;
  originalFileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  fileHash?: string | null;
  storagePath?: string | null;
  sniffedMimeType?: string | null;
  uploadStatus?: "ready" | "quarantined" | "processing" | "rejected" | null;
  quarantineReason?: string | null;
  metadataSignature?: string | null;
  metadataSignedAt?: string | null;
  metadataPayload?: Record<string, unknown> | null;
  indexingStatus?: "disabled" | "pending" | "completed" | "failed" | null;
  ocrStatus?: "disabled" | "pending" | "completed" | "failed" | null;
  extractedText?: string | null;
  legalHold?: boolean;
  legalHoldReason?: string | null;
  retentionScheduleCode?: string | null;
  retentionTrigger?: string | null;
  retentionDispositionAt?: string | null;
  archiveTier?: "standard" | "immutable-worm" | null;
  archiveLockedAt?: string | null;
  trustedTimestampToken?: string | null;
  trustedTimestampAt?: string | null;
  checksumAlgorithm?: string | null;
  checksumVerifiedAt?: string | null;
  watermarkTemplate?: string | null;
  signatureKeyId?: string | null;
}

export interface TimerRecord {
  id: string;
  trustId?: string;
  immutable?: boolean;
  deletedAt?: string | null;
  relatedTaskId?: string | null;
  relatedDocumentId?: string | null;
  timerType: string;
  label: string;
  startedAt: string;
  stoppedAt: string | null;
  durationSeconds: number;
  notes?: string;
  createdBy: string;
}

export interface AuditRecord {
  id: string;
  tenantId?: string | null;
  trustId?: string | null;
  actor: string;
  entityType: string;
  entityId: string | null;
  action: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  createdAt: string;
  sequence: number;
  previousHash: string | null;
  hash: string;
}

export type UserRole = "VIEWER" | "EDITOR" | "ADMIN";

export interface AppUser {
  id: string;
  tenantId: string;
  trustIds: string[];
  activeTrustId: string;
  immutable?: boolean;
  deletedAt?: string | null;
  email: string;
  fullName: string;
  role: UserRole;
  passwordHash: string;
  passwordSalt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
  passwordChangeRequired?: boolean;
  sessionVersion?: number;
  passwordChangedAt?: string | null;
  failedLoginCount?: number;
  lockedUntil?: string | null;
  lockoutCount?: number;
  disabledAt?: string | null;
  disabledReason?: string | null;
  mfaEnabled?: boolean;
  mfaSecret?: string | null;
  mfaPendingSecret?: string | null;
  mfaRecoveryCodes?: string[];
  mfaPendingRecoveryCodes?: string[];
  mfaEnrolledAt?: string | null;
  lastLoginIp?: string | null;
  lastLoginUserAgent?: string | null;
}

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  trustIds: string[];
  activeTrustId: string;
  email: string;
  fullName: string;
  role: UserRole;
  mustChangePassword: boolean;
  sessionId?: string | null;
  sessionVersion?: number;
  mfaEnabled?: boolean;
  mfaSetupRequired?: boolean;
}

export interface RefreshSession {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdByIp?: string | null;
  createdByUserAgent?: string | null;
  lastUsedIp?: string | null;
  lastUsedUserAgent?: string | null;
  sessionVersion?: number;
}

export interface TrustLedgerRecord {
  id: string;
  trustId: string;
  ledgerCode: string;
  ledgerType: string;
  name: string;
  description?: string;
  immutable?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExhibitIndexRecord {
  id: string;
  trustId: string;
  documentId: string;
  exhibitCode: string;
  sequenceNumber: number;
  label: string;
  immutable?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrustLedgerEntryRecord {
  id: string;
  trustId: string;
  ledgerId: string;
  entryCode: string;
  entryType: string;
  documentId?: string | null;
  exhibitId?: string | null;
  title: string;
  description?: string;
  effectiveDate: string;
  postedAt: string;
  immutable?: boolean;
  deletedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AccountingEntryRecord {
  id: string;
  trustId: string;
  ledgerId: string;
  entryCode: string;
  documentId?: string | null;
  distributionId?: string | null;
  accountCode: string;
  direction: "debit" | "credit";
  amount: number;
  currency: string;
  memo?: string;
  postedAt: string;
  immutable?: boolean;
  deletedAt?: string | null;
}

export interface AuthorityChainRecord {
  id: string;
  trustId: string;
  documentId: string;
  authorityType: string;
  parentDocumentId?: string | null;
  status: "valid" | "warning" | "invalid";
  validatedAt: string;
  notes?: string;
}

export interface BeneficiaryRecord {
  id: string;
  trustId: string;
  beneficiaryCode: string;
  fullName: string;
  beneficiaryType: string;
  status: string;
  allocationPercent: number;
  notes?: string;
  immutable?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRecord {
  id: string;
  trustId: string;
  targetType: "distribution" | "packet";
  targetId: string;
  actionType: "approval";
  stage: string;
  actorEmail: string;
  actorRole: UserRole;
  decision: "approved" | "rejected";
  notes: string;
  reasonCode: string;
  createdAt: string;
  immutable?: boolean;
}

export interface DistributionRecord {
  id: string;
  trustId: string;
  beneficiaryId: string;
  documentId?: string | null;
  requestCode: string;
  category: string;
  amount: number;
  currency: string;
  status: "requested" | "pending_approval" | "approved" | "paid" | "rejected";
  requestedAt: string;
  requestedBy?: string | null;
  requestedByRole?: UserRole | null;
  reasonCode?: string | null;
  requiredApprovals?: number;
  approvalCount?: number;
  approvedAt?: string | null;
  approvedBy?: string | null;
  paidAt?: string | null;
  notes?: string;
  versionNo?: number;
  immutable?: boolean;
  deletedAt?: string | null;
}

export interface NoticeRecord {
  id: string;
  trustId: string;
  documentId?: string | null;
  contactId?: string | null;
  noticeCode: string;
  noticeType: string;
  serviceMethod: string;
  status: "draft" | "issued" | "served" | "failed";
  issuedAt: string;
  servedAt?: string | null;
  dueDate?: string | null;
  trackingNumber?: string | null;
  recipientName: string;
  recipientAddress?: string;
  notes?: string;
  immutable?: boolean;
  deletedAt?: string | null;
}


export interface GovernancePolicyVersionRecord {
  id: string;
  trustId: string;
  policyType: "trust-policy-template" | "approval-thresholds" | "jurisdiction-hint-pack";
  policyKey: string;
  title: string;
  version: number;
  status: "draft" | "active" | "superseded";
  content: Record<string, unknown>;
  changeSummary?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  createdBy: string;
  previousVersionId?: string | null;
  signature: string;
  signatureEnvelope: {
    algorithm: string;
    keyId: string;
    scope: string;
    signedAt: string;
    signerIdentity?: string;
    publicKeyFingerprint?: string;
  };
  historyHash: string;
}

export interface PacketRecord {
  id: string;
  trustId: string;
  packetCode: string;
  packetType: "administrative-record" | "evidence-package";
  title: string;
  status: "pending_approval" | "generated" | "anchored" | "rejected";
  documentIds: string[];
  noticeIds: string[];
  ledgerEntryIds: string[];
  exhibitIds: string[];
  generatedAt: string;
  generatedBy: string;
  generatedByRole?: UserRole | null;
  reasonCode?: string | null;
  notes?: string | null;
  requiredApprovals?: number;
  approvalCount?: number;
  manifestPath?: string | null;
  bundleDir?: string | null;
  bundlePath?: string | null;
  manifestSignature?: string | null;
  bundleSignature?: string | null;
  manifestHash?: string | null;
  bundleHash?: string | null;
  timestampPath?: string | null;
  timestampToken?: string | null;
  timestampAuthority?: string | null;
  manifestKeyId?: string | null;
  verificationSummaryPath?: string | null;
  exportWatermark?: string | null;
  anchoredAt?: string | null;
  hashAnchorReceipt?: string | null;
  versionNo?: number;
  deletedAt?: string | null;
  immutable?: boolean;
}



export interface ArtifactStatusRecord {
  id: string;
  artifactType: "packet-bundle" | "evidence-bundle" | "artifact";
  artifactId: string;
  trustId: string;
  packetId?: string | null;
  bundlePath?: string | null;
  bundleHash?: string | null;
  manifestHash?: string | null;
  publicProofProvider: "opentimestamps" | "bitcoin" | "internal";
  status: "pending" | "submitted" | "confirmed" | "failed";
  verificationStatus: "pending" | "verified" | "failed";
  anchorRef?: string | null;
  anchorProof?: string | null;
  anchorReceiptPath?: string | null;
  verificationReceiptPath?: string | null;
  failureReason?: string | null;
  lastCheckedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GovernanceState {
  tenants?: TenantRecord[];
  trusts?: TrustRecord[];
  settings: Record<string, unknown>;
  deadlineRules: Array<Record<string, unknown>>;
  integrations: IntegrationRecord[];
  documents: DocumentRecord[];
  contacts: ContactRecord[];
  tasks: TaskRecord[];
  role: string;
  permissions: Record<string, unknown>;
  timers: TimerRecord[];
  audit: AuditRecord[];
  users: AppUser[];
  sessions?: RefreshSession[];
  trustLedgers?: TrustLedgerRecord[];
  exhibitIndex?: ExhibitIndexRecord[];
  trustLedgerEntries?: TrustLedgerEntryRecord[];
  accountingEntries?: AccountingEntryRecord[];
  authorityChain?: AuthorityChainRecord[];
  beneficiaries?: BeneficiaryRecord[];
  distributions?: DistributionRecord[];
  notices?: NoticeRecord[];
  packets?: PacketRecord[];
  approvals?: ApprovalRecord[];
  policyVersions?: GovernancePolicyVersionRecord[];
  artifactStatuses?: ArtifactStatusRecord[];
}

export interface DocumentVerificationSummary {
  documentId: string;
  displayId: string;
  checksumAlgorithm: string;
  recordedChecksum: string | null;
  currentChecksum: string | null;
  checksumMatches: boolean | null;
  storagePresent: boolean;
  legalHold: boolean;
  legalHoldReason?: string | null;
  retentionScheduleCode?: string | null;
  retentionDispositionAt?: string | null;
  archiveTier?: string | null;
  archiveLockedAt?: string | null;
  watermarkTemplate?: string | null;
  trustedTimestampAt?: string | null;
  trustedTimestampToken?: string | null;
  signatureKeyId?: string | null;
}

export interface PacketManifestSummary {
  packetId: string;
  packetCode: string;
  manifestPath?: string | null;
  verificationSummaryPath?: string | null;
  manifestHash?: string | null;
  manifestSignature?: string | null;
  manifestKeyId?: string | null;
  exportWatermark?: string | null;
  timestampToken?: string | null;
  timestampAuthority?: string | null;
  anchoredAt?: string | null;
  artifactStatus?: ArtifactStatusRecord | null;
}

export interface StorageMeta {
  mode: "file" | "postgres";
  durable: boolean;
  location: string;
  initializedAt: string;
  lastPersistedAt: string | null;
}

export interface AuditVerification {
  valid: boolean;
  checkedAt: string;
  length: number;
  headHash: string | null;
  issues: string[];
}

export interface RequestContext {
  user: AuthenticatedUser;
}
