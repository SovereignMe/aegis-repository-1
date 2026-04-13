import crypto from "node:crypto";
import type { AccountingEntryRecord, DocumentRecord, RequestContext, TrustLedgerEntryRecord } from "../../models/domain.js";
import { getActor } from "../../services/authorization.service.js";
import { db } from "../../store/governance-store.js";
import { inferRdsCode } from "./governance-policy-service.js";
import { authorityChainRepository } from "./authority-chain-repository.js";

function nowIso() { return new Date().toISOString(); }
function sequence(prefix: string, count: number) { return `${prefix}-${String(count + 1).padStart(4, "0")}`; }
function getLedgerIdByCode(ledgerCode: string) { return db.trustLedgers.find((ledger) => ledger.ledgerCode === ledgerCode)?.id || ledgerCode; }

export class DocumentGovernanceService {
  buildDocumentGovernanceDraft(input: Partial<DocumentRecord>) {
    const exhibitSequence = (db.exhibitIndex || []).filter((item) => !item.deletedAt).length + 1;
    const exhibitCode = input.exhibitCode || `EXHIBIT ${String.fromCharCode(64 + ((exhibitSequence - 1) % 26) + 1)}`;
    return {
      rdsCode: inferRdsCode(input),
      exhibitCode,
      suggestedLedgerCodes: input.docType === "accounting" ? ["AL-001", "DX-001"] : ["ML-001", "DX-001"],
    };
  }

  validateDocumentBeforeCreate(input: Partial<DocumentRecord>) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const governingDocs = db.documents.filter((item) => item.docType === "governing" && !item.deletedAt);
    if (input.docType === "governing" && input.governingLevel === "controlling" && governingDocs.some((item) => item.governingLevel === "controlling")) {
      errors.push("A controlling governing instrument already exists and the governing hierarchy lock prevents a second controlling document.");
    }
    if (input.displayId && db.documents.some((item) => item.displayId === input.displayId && !item.deletedAt)) {
      errors.push("Display ID must be unique.");
    }
    if (input.exhibitCode && db.exhibitIndex.some((item) => item.exhibitCode === input.exhibitCode && !item.deletedAt)) {
      errors.push("Exhibit code must be unique within the Master Document Exhibit Index.");
    }
    if (!input.title) warnings.push("Title was not provided; the intake flow will assign UNTITLED DOCUMENT.");
    return { valid: errors.length === 0, errors, warnings, governanceDraft: this.buildDocumentGovernanceDraft(input) };
  }

  async registerDocumentArtifacts(context: RequestContext, document: DocumentRecord) {
    const actor = getActor(context);
    const exhibitRecord = {
      id: crypto.randomUUID(),
      trustId: document.trustId,
      documentId: document.id,
      exhibitCode: document.exhibitCode,
      sequenceNumber: (db.exhibitIndex || []).filter((item) => !item.deletedAt).length + 1,
      label: document.title,
      immutable: Boolean(document.immutable),
      deletedAt: null,
      createdAt: document.createdAt || document.updatedAt,
      updatedAt: document.updatedAt,
    };
    db.exhibitIndex = [...(db.exhibitIndex || []).filter((item) => item.documentId !== document.id), exhibitRecord].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    const ledgerId = getLedgerIdByCode(document.docType === "accounting" ? "AL-001" : "ML-001");
    const ledgerEntry: TrustLedgerEntryRecord = {
      id: crypto.randomUUID(),
      trustId: document.trustId,
      ledgerId,
      entryCode: sequence("MTL", (db.trustLedgerEntries || []).length),
      entryType: document.docType,
      documentId: document.id,
      exhibitId: exhibitRecord.id,
      title: document.title,
      description: `${document.displayId} • ${document.summary || document.docType}`,
      effectiveDate: document.effectiveDate,
      postedAt: nowIso(),
      immutable: Boolean(document.immutable),
      deletedAt: null,
      metadata: {
        displayId: document.displayId,
        exhibitCode: document.exhibitCode,
        rdsCode: inferRdsCode(document),
      },
    };
    db.trustLedgerEntries = [ledgerEntry, ...(db.trustLedgerEntries || [])];

    if (document.docType === "accounting") {
      const accountingEntry: AccountingEntryRecord = {
        id: crypto.randomUUID(),
        trustId: document.trustId,
        ledgerId: getLedgerIdByCode("AL-001"),
        entryCode: sequence("ACC", (db.accountingEntries || []).length),
        documentId: document.id,
        distributionId: null,
        accountCode: "ADMIN-DOC",
        direction: "debit",
        amount: 0,
        currency: "USD",
        memo: `Document-linked accounting shell for ${document.displayId}`,
        postedAt: nowIso(),
        immutable: Boolean(document.immutable),
        deletedAt: null,
      };
      db.accountingEntries = [accountingEntry, ...(db.accountingEntries || [])];
    }

    const authority = authorityChainRepository.replaceForDocument(document);
    db.addAudit("DOCUMENT_GOVERNANCE_REGISTERED", "document", document.id, null, { exhibitRecord, ledgerEntry, authority }, undefined, actor);
    await db.persist("document-governance-registered");
    return { exhibitRecord, ledgerEntry, authority };
  }
}

export const documentGovernanceService = new DocumentGovernanceService();
