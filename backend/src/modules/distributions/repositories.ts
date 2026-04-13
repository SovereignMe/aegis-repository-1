import crypto from "node:crypto";
import type { AccountingEntryRecord, DistributionRecord, RequestContext, UserRole } from "../../models/domain.js";
import { assertAuthorized, getActor } from "../../services/authorization.service.js";
import { db } from "../../store/governance-store.js";
import { resolveTrustId } from "../../services/tenancy.service.js";
import { assertMakerCheckerSeparation, assertRecordTrustAccess } from "../../services/trust-boundary.service.js";
import { withUnitOfWork } from "../../store/unit-of-work.js";
import { lockDistributionRow } from "../../store/postgres-locks.js";
import { assertApprovedDistributionAccounting } from "../governance/governance-invariants.js";

function nowIso() { return new Date().toISOString(); }
function sequence(prefix: string, count: number) { return `${prefix}-${String(count + 1).padStart(4, "0")}`; }
function getLedgerIdByCode(ledgerCode: string) { return db.trustLedgers.find((ledger) => ledger.ledgerCode === ledgerCode)?.id || ledgerCode; }
function getApprovalSettings() { const root = (db.settings as Record<string, any>)?.approvals || {}; return { enabled: root.enabled !== false, makerChecker: root.makerChecker !== false, mandatoryNotes: root.mandatoryNotes !== false, mandatoryReasonCodes: root.mandatoryReasonCodes !== false, distributions: { enabled: root.distributions?.enabled !== false, baseRequiredApprovals: Number(root.distributions?.baseRequiredApprovals || 1), thresholdAmount: Number(root.distributions?.thresholdAmount || 5000), thresholdRequiredApprovals: Number(root.distributions?.thresholdRequiredApprovals || 2) } }; }
function requireApprovalMemo(input: { notes?: string | null; reasonCode?: string | null }, actionLabel: string) { const settings = getApprovalSettings(); if (settings.mandatoryNotes && String(input.notes || '').trim().length < 3) throw Object.assign(new Error(`${actionLabel} requires approval notes.`), { statusCode: 400 }); if (settings.mandatoryReasonCodes && String(input.reasonCode || '').trim().length < 2) throw Object.assign(new Error(`${actionLabel} requires a reason code.`), { statusCode: 400 }); }
function createApprovalRecord(params: { trustId: string; targetType: "distribution"; targetId: string; actorEmail: string; actorRole: UserRole; notes: string; reasonCode: string; stage: string; decision?: "approved" | "rejected"; }) { return { id: crypto.randomUUID(), trustId: params.trustId, targetType: params.targetType, targetId: params.targetId, actionType: "approval", stage: params.stage, actorEmail: params.actorEmail, actorRole: params.actorRole, decision: params.decision || "approved", notes: params.notes, reasonCode: params.reasonCode, createdAt: nowIso(), immutable: true } as any; }
function approvalsFor(targetId: string) { return (db.approvals || []).filter((item) => item.targetType === "distribution" && item.targetId === targetId); }
function assertDualControl(requestedBy: string | null | undefined, actorEmail: string, label: string) { const settings = getApprovalSettings(); if (settings.makerChecker && requestedBy && requestedBy.toLowerCase() === actorEmail.toLowerCase()) throw Object.assign(new Error(`${label} requires maker-checker separation. The requester cannot approve the same action.`), { statusCode: 403 }); }
function distributionRequiredApprovals(amount: number) { const settings = getApprovalSettings(); if (!settings.enabled || !settings.distributions.enabled) return 0; return amount >= settings.distributions.thresholdAmount ? settings.distributions.thresholdRequiredApprovals : settings.distributions.baseRequiredApprovals; }

export class DistributionRepository {
  listByTrust(trustId: string) { return (db.distributions || []).filter((item) => item.trustId === trustId && !item.deletedAt); }
  findActiveById(id: string) { return (db.distributions || []).find((item) => item.id === id && !item.deletedAt) || null; }
  findActiveIndex(id: string) { return (db.distributions || []).findIndex((item) => item.id === id && !item.deletedAt); }
  updateAt(index: number, record: DistributionRecord) { const items = db.distributions || []; items[index] = record; db.distributions = items; return record; }
  async requestDistribution(context: RequestContext, input: Partial<DistributionRecord>) {
    assertAuthorized(context, "distributions.request", "Requesting distributions");
    requireApprovalMemo({ notes: input.notes || "", reasonCode: input.reasonCode || "" }, "Distribution request");
    return withUnitOfWork("distribution-requested", async () => {
      const trustId = resolveTrustId(context, input.trustId || null).trustId;
      const amount = Number(input.amount || 0); const requiredApprovals = distributionRequiredApprovals(amount);
      const record: DistributionRecord = { id: crypto.randomUUID(), trustId, beneficiaryId: input.beneficiaryId || null, documentId: input.documentId || null, requestCode: input.requestCode || sequence("DST", (db.distributions || []).length), category: input.category || "beneficiary-support", amount, currency: input.currency || "USD", status: requiredApprovals > 0 ? "pending_approval" : "approved", requestedAt: input.requestedAt || nowIso(), requestedBy: context.user.email, requestedByRole: context.user.role, approvedAt: requiredApprovals > 0 ? null : nowIso(), approvedBy: requiredApprovals > 0 ? null : context.user.email, approvalCount: requiredApprovals > 0 ? 0 : 1, requiredApprovals, notes: input.notes || null, reasonCode: input.reasonCode || null, versionNo: 1, immutable: false, deletedAt: null } as any;
      db.distributions = [record, ...(db.distributions || [])];
      db.addAudit("DISTRIBUTION_REQUESTED", "distribution", record.id, null, record, { requiredApprovals }, getActor(context));
      if (requiredApprovals === 0) {
        const accountingEntry: AccountingEntryRecord = { id: crypto.randomUUID(), trustId, ledgerId: getLedgerIdByCode("AL-001"), entryCode: sequence("ACC", (db.accountingEntries || []).length), documentId: record.documentId || null, distributionId: record.id, accountCode: "BENEFICIARY-DIST", direction: "debit", amount: record.amount, currency: record.currency, memo: `Approved distribution ${record.requestCode}`, postedAt: nowIso(), immutable: false, deletedAt: null } as any;
        db.accountingEntries = [accountingEntry, ...(db.accountingEntries || [])];
        db.addAudit("DISTRIBUTION_APPROVED", "distribution", record.id, null, record, { accountingEntryId: accountingEntry.id, autoApproved: true }, getActor(context));
        assertApprovedDistributionAccounting(record.id, trustId);
      }
      return requiredApprovals > 0 ? { distribution: record, pendingApprovalsRemaining: requiredApprovals } : { distribution: record };
    });
  }
  async approveDistribution(context: RequestContext, id: string, input: { notes: string; reasonCode: string }) {
    assertAuthorized(context, "distributions.approve", "Approving distributions"); requireApprovalMemo(input, "Distribution approval");
    return withUnitOfWork("distribution-approved", async (client) => {
      const index = (db.distributions || []).findIndex((item) => item.id === id && !item.deletedAt); if (index < 0) throw new Error("Distribution not found.");
      const locked = client ? await lockDistributionRow(client, id) : null;
      const before = structuredClone(locked || db.distributions[index]); if (before.status !== "pending_approval") throw new Error("Only pending distributions can be approved.");
      assertRecordTrustAccess(context, before, "Distribution");
      assertDualControl(before.requestedBy, context.user.email, "Distribution approval");
      assertMakerCheckerSeparation(context, before, "Distribution approval", { enforceRoleSeparation: true });
      const approval = createApprovalRecord({ trustId: before.trustId, targetType: "distribution", targetId: before.id, actorEmail: context.user.email, actorRole: context.user.role, notes: String(input.notes || ""), reasonCode: String(input.reasonCode || ""), stage: `distribution-approval-${(before.approvalCount || 0)+1}` });
      db.approvals = [approval, ...(db.approvals || [])]; const nextApprovalCount = approvalsFor(before.id).length; const requiredApprovals = Math.max(1, Number(before.requiredApprovals || 1));
      if (nextApprovalCount < requiredApprovals) { const updatedPending: DistributionRecord = { ...before, status: "pending_approval", approvalCount: nextApprovalCount, versionNo: Number(before.versionNo || 1) + 1 } as DistributionRecord; db.distributions[index] = updatedPending; db.addAudit("DISTRIBUTION_APPROVAL_RECORDED", "distribution", updatedPending.id, before, updatedPending, { approvalId: approval.id, requiredApprovals, approvalCount: nextApprovalCount }, getActor(context)); return { distribution: updatedPending, approval, pendingApprovalsRemaining: requiredApprovals - nextApprovalCount }; }
      const updated: DistributionRecord = { ...before, status: "approved", approvalCount: nextApprovalCount, approvedAt: nowIso(), approvedBy: context.user.email, versionNo: Number(before.versionNo || 1) + 1 } as any; db.distributions[index] = updated;
      const accountingEntry: AccountingEntryRecord = { id: crypto.randomUUID(), trustId: updated.trustId, ledgerId: getLedgerIdByCode("AL-001"), entryCode: sequence("ACC", (db.accountingEntries || []).length), documentId: updated.documentId || null, distributionId: updated.id, accountCode: "BENEFICIARY-DIST", direction: "debit", amount: updated.amount, currency: updated.currency, memo: `Approved distribution ${updated.requestCode}`, postedAt: nowIso(), immutable: false, deletedAt: null } as any;
      db.accountingEntries = [accountingEntry, ...(db.accountingEntries || [])]; db.addAudit("DISTRIBUTION_APPROVED", "distribution", updated.id, before, updated, { accountingEntryId: accountingEntry.id, approvalId: approval.id, approvalCount: nextApprovalCount }, getActor(context));
      assertApprovedDistributionAccounting(updated.id, updated.trustId); return { distribution: updated, accountingEntry, approval };
    });
  }
}

export const distributionRepository = new DistributionRepository();
