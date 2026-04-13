import type { RequestContext } from "../../models/domain.js";
import { canPerform } from "../../services/authorization.service.js";
import { db } from "../../store/governance-store.js";
import { resolveTrustId, scopeCollectionByTrust } from "../../services/tenancy.service.js";

export class GovernanceQueryRepository {
  private getScopedWorkspaceData(context: RequestContext) {
    const { trustId } = resolveTrustId(context);
    const role = context.user.role;
    const canReadBeneficiaries = canPerform("beneficiaries.read", role);
    const canReadDistributions = canPerform("distributions.read", role);
    const canReadNotices = canPerform("notices.read", role);
    const canReadAccounting = canPerform("accounting.read", role);
    const documents = scopeCollectionByTrust(db.documents, trustId);
    const trustLedgers = scopeCollectionByTrust((db.trustLedgers || []), trustId);
    const trustLedgerEntries = scopeCollectionByTrust((db.trustLedgerEntries || []), trustId);
    const accountingEntries = canReadAccounting ? scopeCollectionByTrust((db.accountingEntries || []), trustId) : [];
    const beneficiaries = canReadBeneficiaries ? scopeCollectionByTrust((db.beneficiaries || []), trustId) : [];
    const distributions = canReadDistributions ? scopeCollectionByTrust((db.distributions || []), trustId) : [];
    const notices = canReadNotices ? scopeCollectionByTrust((db.notices || []), trustId) : [];
    const packets = scopeCollectionByTrust((db.packets || []), trustId);
    const approvals = scopeCollectionByTrust((db.approvals || []), trustId);
    const authorityChain = scopeCollectionByTrust((db.authorityChain || []), trustId);
    const exhibitIndex = scopeCollectionByTrust((db.exhibitIndex || []), trustId);
    const policyVersions = scopeCollectionByTrust((db.policyVersions || []), trustId);
    const policyGovernance = (db.settings as Record<string, any>)?.policyGovernance || {};
    const auditVerification = db.verifyAudit(trustId);
    const complianceIssues = [
      ...documents.filter((document) => !exhibitIndex.some((entry) => entry.documentId === document.id)).map((document) => ({ severity: "high", area: "repository", message: `${document.displayId || document.id} is missing an exhibit-index row.` })),
      ...distributions.filter((distribution) => distribution.status === "approved" && !accountingEntries.some((entry) => entry.distributionId === distribution.id)).map((distribution) => ({ severity: "critical", area: "accounting", message: `${distribution.requestCode || distribution.id} is approved without a matching accounting entry.` })),
      ...notices.filter((notice) => notice.status !== "served" && notice.dueDate && new Date(notice.dueDate).getTime() < Date.now()).map((notice) => ({ severity: "medium", area: "notices", message: `${notice.noticeCode || notice.id} is overdue for service or follow-up.` })),
    ];

    return {
      trustId,
      documents,
      trustLedgers,
      trustLedgerEntries,
      accountingEntries,
      beneficiaries,
      distributions,
      notices,
      packets,
      approvals,
      authorityChain,
      exhibitIndex,
      policyVersions,
      policyGovernance,
      auditVerification,
      complianceIssues,
    };
  }

  private buildWorkspacePages(context: RequestContext) {
    const {
      documents,
      trustLedgers,
      trustLedgerEntries,
      accountingEntries,
      beneficiaries,
      distributions,
      notices,
      packets,
      approvals,
      authorityChain,
      exhibitIndex,
      policyVersions,
      policyGovernance,
      auditVerification,
      complianceIssues,
    } = this.getScopedWorkspaceData(context);

    return {
      "administrative-records": { page: "administrative-records", title: "Administrative Records", records: documents, authorityChain, exhibitIndex, metrics: { records: documents.length, exhibits: exhibitIndex.length, authorityLinks: authorityChain.length } },
      notices: { page: "notices", title: "Notices & Service", notices, metrics: { notices: notices.length, pending: notices.filter((item) => item.status !== "served").length, served: notices.filter((item) => item.status === "served").length } },
      beneficiaries: { page: "beneficiaries", title: "Beneficiaries", beneficiaries, distributions, metrics: { beneficiaries: beneficiaries.length, pendingDistributions: distributions.filter((item) => ["requested", "pending_approval"].includes(String(item.status || ""))).length } },
      ledgers: { page: "ledgers", title: "Ledgers", ledgers: trustLedgers, ledgerEntries: trustLedgerEntries, accountingEntries, metrics: { ledgers: trustLedgers.length, ledgerEntries: trustLedgerEntries.length, accountingEntries: accountingEntries.length } },
      packets: { page: "packets", title: "Governance Packets", packets, records: documents, notices, metrics: { packets: packets.length, ready: packets.filter((item) => ["ready_for_approval", "sealed", "finalized"].includes(String(item.status || ""))).length } },
      approvals: { page: "approvals", title: "Approvals", approvals, distributions: distributions.filter((item) => ["requested", "pending_approval"].includes(String(item.status || ""))), packets: packets.filter((item) => ["assembling", "ready_for_approval", "approval_in_progress"].includes(String(item.status || ""))), metrics: { approvals: approvals.length, pendingDistributions: distributions.filter((item) => ["requested", "pending_approval"].includes(String(item.status || ""))).length, pendingPackets: packets.filter((item) => ["assembling", "ready_for_approval", "approval_in_progress"].includes(String(item.status || ""))).length } },
      policies: { page: "policies", title: "Policies & Authority", policyVersions, policyGovernance, authorityChain, metrics: { versions: policyVersions.length, activePolicySets: Object.keys(policyGovernance?.activeVersionIds || {}).length } },
      verification: { page: "verification", title: "Verification & Audit", verification: auditVerification, issues: complianceIssues, records: documents.filter((item) => item.sourceType === "upload"), metrics: { auditEvents: auditVerification?.length || 0, issues: complianceIssues.length } },
    } as Record<string, Record<string, unknown>>;
  }

  listArtifacts(context: RequestContext) {
    const { trustId } = resolveTrustId(context);
    const role = context.user.role;
    const canReadBeneficiaries = canPerform("beneficiaries.read", role);
    const canReadDistributions = canPerform("distributions.read", role);
    const canReadNotices = canPerform("notices.read", role);
    const canReadAccounting = canPerform("accounting.read", role);
    const approvals = scopeCollectionByTrust((db.approvals || []), trustId);
    return {
      trustLedgers: scopeCollectionByTrust(db.trustLedgers, trustId),
      trustLedgerEntries: scopeCollectionByTrust((db.trustLedgerEntries || []), trustId),
      accountingEntries: canReadAccounting ? scopeCollectionByTrust((db.accountingEntries || []), trustId) : [],
      authorityChain: scopeCollectionByTrust((db.authorityChain || []), trustId),
      beneficiaries: canReadBeneficiaries ? scopeCollectionByTrust((db.beneficiaries || []), trustId) : [],
      distributions: canReadDistributions ? scopeCollectionByTrust((db.distributions || []), trustId) : [],
      notices: canReadNotices ? scopeCollectionByTrust((db.notices || []), trustId) : [],
      packets: scopeCollectionByTrust((db.packets || []), trustId),
      exhibitIndex: scopeCollectionByTrust((db.exhibitIndex || []), trustId),
      approvals,
      policyVersions: scopeCollectionByTrust((db.policyVersions || []), trustId),
      policyGovernance: (db.settings as Record<string, any>)?.policyGovernance || {},
    };
  }


  getAdministrativeRecordsPage(context: RequestContext) {
    return this.buildWorkspacePages(context)["administrative-records"];
  }

  getNoticesPage(context: RequestContext) {
    return this.buildWorkspacePages(context).notices;
  }

  getBeneficiariesPage(context: RequestContext) {
    return this.buildWorkspacePages(context).beneficiaries;
  }

  getLedgersPage(context: RequestContext) {
    return this.buildWorkspacePages(context).ledgers;
  }

  getPacketsPage(context: RequestContext) {
    return this.buildWorkspacePages(context).packets;
  }

  getApprovalsPage(context: RequestContext) {
    return this.buildWorkspacePages(context).approvals;
  }

  getPoliciesPage(context: RequestContext) {
    return this.buildWorkspacePages(context).policies;
  }

  getVerificationPage(context: RequestContext) {
    return this.buildWorkspacePages(context).verification;
  }

  getWorkspacePage(context: RequestContext, page: string) {
    return this.buildWorkspacePages(context)[page] || { page, title: "Governance Workspace" };
  }
}

export const governanceQueryRepository = new GovernanceQueryRepository();
