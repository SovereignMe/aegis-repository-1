import type { RequestContext } from "../models/domain.js";
import { resolveTrustId } from "./tenancy.service.js";
import { recordSecurityEvent } from "./observability.service.js";

type ScopedRecord = {
  trustId?: string | null;
  tenantId?: string | null;
  requestedBy?: string | null;
  generatedBy?: string | null;
  approvedBy?: string | null;
};

function asLower(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

export function requireTrustScope(
  context: RequestContext,
  record: { trustId?: string | null } | null | undefined,
  label = "Record",
) {
  const { trustId } = resolveTrustId(context);

  if (!record) {
    const error = new Error(`${label} not found.`) as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  if (!record.trustId || record.trustId !== trustId) {
    recordSecurityEvent({ eventType: "authz.denied", outcome: "denied", severity: "high", actorRole: context.user.role, actorEmail: context.user.email, tenantId: context.user.tenantId, trustId, recordType: label, recordId: null, metadata: { reason: "trust-scope-mismatch", requestedTrustId: trustId, recordTrustId: record.trustId || null } });
    const error = new Error(`Trust access denied: ${label} is outside the caller's trust scope.`) as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }

  return record;
}

export function requireTrustMatch(
  context: RequestContext,
  trustId: string | null | undefined,
  label = "Operation",
) {
  const resolved = resolveTrustId(context).trustId;

  if (!trustId || trustId !== resolved) {
    recordSecurityEvent({ eventType: "authz.denied", outcome: "denied", severity: "high", actorRole: context.user.role, actorEmail: context.user.email, tenantId: context.user.tenantId, trustId: resolved, recordType: label, recordId: null, metadata: { reason: "operation-trust-mismatch", requestedTrustId: trustId || null } });
    const error = new Error(`Trust access denied: ${label} is outside the caller's trust scope.`) as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }
}

export function assertRecordTrustAccess(context: RequestContext, record: ScopedRecord, label = "Record") {
  requireTrustScope(context, record, label);
  const { tenantId, trustId, trustIds } = resolveTrustId(context, record.trustId || null);
  if (record.tenantId && record.tenantId !== tenantId) {
    recordSecurityEvent({ eventType: "authz.denied", outcome: "denied", severity: "critical", actorRole: context.user.role, actorEmail: context.user.email, tenantId, trustId, recordType: label, metadata: { reason: "tenant-scope-mismatch", recordTenantId: record.tenantId } });
    const error = new Error(`${label} tenant access denied.`) as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }
  if (!trustIds.includes(trustId)) {
    recordSecurityEvent({ eventType: "authz.denied", outcome: "denied", severity: "critical", actorRole: context.user.role, actorEmail: context.user.email, tenantId, trustId, recordType: label, metadata: { reason: "trust-not-assigned", assignedTrustIds: trustIds } });
    const error = new Error(`${label} trust access denied.`) as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }
  return { tenantId, trustId, trustIds };
}

export function assertScopedTargetAccess(context: RequestContext, targetTrustId?: string | null, label = "Record") {
  requireTrustMatch(context, targetTrustId || null, label);
  return assertRecordTrustAccess(context, { trustId: targetTrustId || null }, label);
}

export function assertMakerCheckerSeparation(
  context: RequestContext,
  record: ScopedRecord,
  label: string,
  options: { enforceRoleSeparation?: boolean } = {},
) {
  const actorEmail = asLower(context.user.email);
  const requester = asLower(record.requestedBy || record.generatedBy);
  if (requester && requester === actorEmail) {
    recordSecurityEvent({ eventType: "authz.denied", outcome: "denied", severity: "high", actorRole: context.user.role, actorEmail: context.user.email, tenantId: context.user.tenantId, trustId: context.user.activeTrustId, recordType: label, approvalState: "maker-checker-violation", metadata: { requester } });
    const error = new Error(`${label} requires maker-checker separation. The initiating actor cannot approve the same action.`) as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }
  if (options.enforceRoleSeparation && record.approvedBy && asLower(record.approvedBy) === actorEmail) {
    recordSecurityEvent({ eventType: "authz.denied", outcome: "denied", severity: "high", actorRole: context.user.role, actorEmail: context.user.email, tenantId: context.user.tenantId, trustId: context.user.activeTrustId, recordType: label, approvalState: "reviewer-independence-violation", metadata: { approvedBy: record.approvedBy } });
    const error = new Error(`${label} requires reviewer independence across approval stages.`) as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }
}
