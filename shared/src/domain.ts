export type TenantId = string & { readonly __brand: "TenantId" };
export type TrustId = string & { readonly __brand: "TrustId" };

export type SecurityEventType =
  | "auth.login"
  | "auth.mfa.challenge"
  | "auth.mfa.enroll"
  | "auth.token.verify"
  | "auth.rate_limit"
  | "authz.denied"
  | "authz.scope"
  | "governance.packet.approval"
  | "request.rate_limit"
  | "documents.upload"
  | "documents.quarantine"
  | "documents.verification.report"
  | "evidence.verify"
  | "backup.restore_drill"
  | "security.header_violation"
  | "other";

export type SecurityEventOutcome = "success" | "failure" | "denied" | "observed" | "blocked";
export type SecurityEventSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface ScopedIdentity {
  tenantId: string;
  trustId: string;
  actorEmail?: string | null;
  actorRole?: string | null;
}

export interface VerificationReportSummary {
  generatedAt: string;
  verifierVersion: string;
  checksumAlgorithm?: string | null;
  signatureKeyId?: string | null;
  trustedTimestampAt?: string | null;
  checksumMatches?: boolean | null;
}

export interface SecurityEventContext {
  eventType?: SecurityEventType;
  outcome?: SecurityEventOutcome;
  severity?: SecurityEventSeverity;
  actorRole?: string;
  actorEmail?: string | null;
  tenantId?: string | null;
  trustId?: string | null;
  recordType?: string | null;
  recordId?: string | null;
  packetId?: string | null;
  approvalState?: string | null;
  evidenceSignatureStatus?: string | null;
  metadata?: Record<string, unknown>;
}
