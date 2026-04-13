import { canPerform } from "../../services/authorization.service.js";
import { db } from "../../store/governance-store.js";
import { resolveTrustId, scopeCollectionByTrust } from "../../services/tenancy.service.js";
import type { RequestContext } from "../../models/domain.js";
import { approvalRepository } from "./approval-repository.js";
import { authorityChainRepository } from "./authority-chain-repository.js";

export class GovernanceOverviewService {
  getOverview(context: RequestContext) {
    const { trustId } = resolveTrustId(context);
    const documents = scopeCollectionByTrust(db.documents, trustId);
    const ledgerEntries = scopeCollectionByTrust((db.trustLedgerEntries || []), trustId);
    const accountingEntries = scopeCollectionByTrust((db.accountingEntries || []), trustId);
    const beneficiaries = scopeCollectionByTrust((db.beneficiaries || []), trustId);
    const distributions = scopeCollectionByTrust((db.distributions || []), trustId);
    const notices = scopeCollectionByTrust((db.notices || []), trustId);
    const packets = scopeCollectionByTrust((db.packets || []), trustId);
    const approvals = approvalRepository.listByTrust(trustId);
    const authorityChain = authorityChainRepository.listByTrust(trustId);
    const controllingDocument = documents.find((item) => item.docType === "governing" && item.governingLevel === "controlling") || null;
    const orphanDocuments = documents.filter((document) => !ledgerEntries.some((entry) => entry.documentId === document.id));
    const invalidAuthority = authorityChain.filter((item) => item.status === "invalid");
    const role = context.user.role;
    const canReadBeneficiaries = canPerform("beneficiaries.read", role);
    const canReadDistributions = canPerform("distributions.read", role);
    const canReadNotices = canPerform("notices.read", role);
    const canReadAccounting = canPerform("accounting.read", role);
    const exhibitIndex = scopeCollectionByTrust((db.exhibitIndex || []), trustId);
    const policyVersions = scopeCollectionByTrust((db.policyVersions || []), trustId);
    const policyGovernance = (db.settings as Record<string, any>)?.policyGovernance || {};
    const activeVersionIds = policyGovernance?.activeVersionIds || {};
    const activePolicyVersions = policyVersions.filter((item) => Object.values(activeVersionIds).includes(item.id) || item.status === "active");
    const auditVerification = db.verifyAudit(trustId);
    const securitySettings = (db.settings as Record<string, any>)?.security || {};
    const complianceSettings = (db.settings as Record<string, any>)?.compliance || {};
    const requiredLedgerCodes = Array.isArray(complianceSettings.requiredLedgerCodes) ? complianceSettings.requiredLedgerCodes : ["ML-001", "DX-001", "AL-001"];
    const presentLedgerCodes = new Set(scopeCollectionByTrust(db.trustLedgers, trustId).map((ledger) => ledger.ledgerCode));
    const uploadedDocuments = documents.filter((item) => item.sourceType === "upload");
    const unsignedUploads = uploadedDocuments.filter((item) => !item.metadataSignature);
    const quarantinedUploads = uploadedDocuments.filter((item) => item.uploadStatus === "quarantined");
    const overdueNotices = notices.filter((item) => item.status !== "served" && item.dueDate && new Date(item.dueDate).getTime() < Date.now());
    const approvedDistributions = distributions.filter((item) => item.status === "approved");
    const approvedWithoutAccounting = approvedDistributions.filter((distribution) => !accountingEntries.some((entry) => entry.distributionId === distribution.id));
    const exhibitCoverageMissing = documents.filter((document) => !exhibitIndex.some((entry) => entry.documentId === document.id));
    const adminUsers = db.users.filter((user) => user.role === "ADMIN" && user.isActive && !user.deletedAt && !user.disabledAt);
    const adminsWithoutMfa = adminUsers.filter((user) => !user.mfaEnabled);
    const activeKeyId = String(securitySettings.sessionSigning?.activeKeyId || "local-k1");

    const checkpoints = [
      {
        key: "controlling-instrument",
        label: "Controlling instrument",
        status: (!complianceSettings.requireControllingInstrument || Boolean(controllingDocument)) ? "pass" : "fail",
        detail: controllingDocument ? `${controllingDocument.displayId} governs the authority chain.` : "No controlling governing instrument is on record.",
      },
      {
        key: "ledger-foundation",
        label: "Required ledgers",
        status: requiredLedgerCodes.every((code: string) => presentLedgerCodes.has(code)) ? "pass" : "fail",
        detail: requiredLedgerCodes.every((code: string) => presentLedgerCodes.has(code)) ? "All required ledgers are present." : `Missing ledger codes: ${requiredLedgerCodes.filter((code: string) => !presentLedgerCodes.has(code)).join(", ")}`,
      },
      {
        key: "document-linkage",
        label: "Document linkage",
        status: orphanDocuments.length === 0 && exhibitCoverageMissing.length === 0 ? "pass" : (orphanDocuments.length <= 1 && exhibitCoverageMissing.length <= 1 ? "warn" : "fail"),
        detail: `Orphan docs: ${orphanDocuments.length}. Missing exhibit rows: ${exhibitCoverageMissing.length}.`,
      },
      {
        key: "authority-chain",
        label: "Authority chain",
        status: invalidAuthority.length === 0 ? "pass" : "fail",
        detail: invalidAuthority.length === 0 ? "Authority lineage validates against the governing lock." : `${invalidAuthority.length} authority records require review.`,
      },
      {
        key: "audit-integrity",
        label: "Audit integrity",
        status: (!complianceSettings.requireAuditVerification || auditVerification.valid) ? "pass" : "fail",
        detail: auditVerification.valid ? `Audit chain verified across ${auditVerification.length} events.` : (auditVerification.issues?.[0] || "Audit verification failed."),
      },
      {
        key: "evidence-storage",
        label: "Evidence storage",
        status: unsignedUploads.length === 0 && quarantinedUploads.length === 0 ? "pass" : (quarantinedUploads.length === 0 ? "warn" : "fail"),
        detail: `Unsigned uploads: ${unsignedUploads.length}. Quarantined uploads: ${quarantinedUploads.length}.`,
      },
      {
        key: "notice-readiness",
        label: "Notice readiness",
        status: overdueNotices.length === 0 ? "pass" : "warn",
        detail: overdueNotices.length === 0 ? "No overdue notices were detected." : `${overdueNotices.length} notices are overdue or pending service review.`,
      },
      {
        key: "distribution-accounting",
        label: "Distribution accounting",
        status: approvedWithoutAccounting.length === 0 ? "pass" : "fail",
        detail: approvedWithoutAccounting.length === 0 ? "Approved distributions reconcile to accounting entries." : `${approvedWithoutAccounting.length} approved distributions are missing accounting entries.`,
      },
      {
        key: "dual-control",
        label: "Dual control",
        status: approvals.length > 0 ? "pass" : "warn",
        detail: approvals.length > 0 ? `${approvals.length} immutable approval events preserved.` : "No explicit approval trail has been recorded yet.",
      },
      {
        key: "access-governance",
        label: "Access governance",
        status: (securitySettings.allowSelfRegistration === false && adminsWithoutMfa.length === 0) ? "pass" : "warn",
        detail: `${securitySettings.allowSelfRegistration === false ? "Self-registration is disabled; account issuance is administrator-controlled." : `Self-registration is enabled with default role ${String(securitySettings.selfRegistrationRole || "VIEWER").toUpperCase()}.`} Admin MFA gaps: ${adminsWithoutMfa.length}. Active key ID: ${activeKeyId}.`,
      },
    ];

    const passedCount = checkpoints.filter((item) => item.status === "pass").length;
    const warnCount = checkpoints.filter((item) => item.status === "warn").length;
    const failCount = checkpoints.filter((item) => item.status === "fail").length;
    const score = Math.round((passedCount / checkpoints.length) * 100);
    const issues = [
      ...(!controllingDocument ? [{ severity: "critical", area: "governing", message: "Add or classify a controlling governing instrument to anchor authority validation." }] : []),
      ...requiredLedgerCodes.filter((code: string) => !presentLedgerCodes.has(code)).map((code: string) => ({ severity: "critical", area: "ledgers", message: `Seed or restore required ledger ${code}.` })),
      ...orphanDocuments.map((document) => ({ severity: "high", area: "repository", message: `${document.displayId} is missing a trust-ledger linkage.` })),
      ...exhibitCoverageMissing.map((document) => ({ severity: "high", area: "repository", message: `${document.displayId} is missing an exhibit-index row.` })),
      ...invalidAuthority.map((item) => ({ severity: "critical", area: "authority", message: `Authority record ${item.id} is invalid for document ${item.documentId}.` })),
      ...quarantinedUploads.map((document) => ({ severity: "high", area: "evidence", message: `${document.displayId} is quarantined: ${document.quarantineReason || "review required"}.` })),
      ...unsignedUploads.map((document) => ({ severity: "medium", area: "evidence", message: `${document.displayId} is missing a metadata signature.` })),
      ...overdueNotices.map((notice) => ({ severity: "medium", area: "notices", message: `${notice.noticeCode} is overdue for service or follow-up.` })),
      ...approvedWithoutAccounting.map((distribution) => ({ severity: "critical", area: "accounting", message: `${distribution.requestCode} is approved without a matching accounting entry.` })),
      ...adminsWithoutMfa.map((user) => ({ severity: "high", area: "security", message: `${user.email} is an active administrator without MFA enrollment.` })),
      ...(approvals.length ? [] : [{ severity: "medium", area: "approvals", message: "Sensitive governance actions have not yet produced an immutable approval trail." }]),
    ].slice(0, 12);

    return {
      controllingDocument,
      governingLock: {
        enabled: true,
        controllingDocumentId: controllingDocument?.id || null,
        invalidAuthorityCount: invalidAuthority.length,
      },
      counts: {
        ledgers: scopeCollectionByTrust(db.trustLedgers, trustId).length,
        ledgerEntries: ledgerEntries.length,
        accountingEntries: canReadAccounting ? accountingEntries.length : 0,
        beneficiaries: canReadBeneficiaries ? beneficiaries.length : 0,
        distributions: canReadDistributions ? distributions.length : 0,
        notices: canReadNotices ? notices.length : 0,
        packets: packets.length,
        approvals: approvals.length,
      },
      orphanDocuments,
      invalidAuthority,
      beneficiaries: canReadBeneficiaries ? beneficiaries : [],
      pendingDistributions: canReadDistributions ? distributions.filter((item) => ["requested", "pending_approval"].includes(item.status)) : [],
      pendingNotices: canReadNotices ? notices.filter((item) => item.status !== "served") : [],
      policyGovernance: {
        activeVersionIds,
        activePolicyVersions,
        totalVersions: policyVersions.length,
        signedHistoryPreserved: policyVersions.every((item) => Boolean(item.signature && item.historyHash)),
      },
      complianceEngine: {
        enabled: complianceSettings.engineEnabled !== false,
        score,
        status: failCount ? "critical" : (warnCount ? "attention" : "healthy"),
        summary: `${passedCount}/${checkpoints.length} checkpoints passing`,
        counts: { passed: passedCount, warnings: warnCount, failed: failCount },
        checkpoints,
        issues,
      },
    };
  }
}

export const governanceOverviewService = new GovernanceOverviewService();
