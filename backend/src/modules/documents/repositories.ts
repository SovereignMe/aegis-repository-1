import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { DocumentRecord, RequestContext } from "../../models/domain.js";
import { env } from "../../config/env.js";
import { getManagedSignerSummary } from "../governance/signing-model.js";
import { assertAuthorized, getActor } from "../../services/authorization.service.js";
import { db } from "../../store/governance-store.js";
import { governanceService } from "../../services/governance.service.js";
import { resolveTrustId, scopeCollectionByTrust } from "../../services/tenancy.service.js";
import { assertSniffedMimeAllowed, FileMetadataEnvelope, quarantineFile, runMalwareScan, runOptionalExtraction, sha256File, signFileMetadata, sniffContentType, validateUploadMetadata } from "../../services/uploadSecurity.service.js";
import { recordSecurityEvent } from "../../services/observability.service.js";

function getTypeCode(type: string) { const map: Record<string, string> = { governing: "GOV", certification: "CER", perfection: "PER", correspondence: "COR", notice: "NOT", accounting: "ACC" }; return map[type] || "DOC"; }
function nextDisplayId(type: string, count: number) { const prefix = getTypeCode(type); const d = new Date(); const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; const serial = String(count + 1).padStart(3, "0"); return `HLH-${prefix}-${datePart}-${serial}`; }
function nextExhibit(count: number) { return `EXHIBIT ${String.fromCharCode(65 + (count % 26))}`; }
function addYearsIso(baseDate: string, years: number | null | undefined) { if (!years || years <= 0) return null; const d = new Date(baseDate || Date.now()); d.setUTCFullYear(d.getUTCFullYear() + years); return d.toISOString(); }
function getRecordsGovernanceSettings() { const root = (db.settings as Record<string, any>)?.recordsGovernance || {}; const schedules = root.retentionSchedules || {}; return { legalHoldEnabled: root.legalHoldEnabled !== false, immutableArchiveTier: String(root.immutableArchiveTier || "immutable-worm"), defaultRetentionTrigger: String(root.defaultRetentionTrigger || "effective-date"), exportWatermarkTemplate: String(root.exportWatermarkTemplate || "HLH FUTURE INVESTMENT TRUST | GOVERNED COPY | {displayId}"), checksumAlgorithm: String(root.checksumAlgorithm || "sha256"), trustedTimestamp: root.trustedTimestamp || { provider: env.evidenceTimestampProvider, enabled: true, mode: env.evidenceTimestampMode }, manifestSigning: root.manifestSigning || { algorithm: "Ed25519", activeKeyId: env.evidenceSigningKeyId, keyStore: env.evidenceSigningKeyStore, keys: { [env.evidenceSigningKeyId]: { publicKeyFingerprint: getManagedSignerSummary("evidence").publicKeyFingerprint, createdAt: "2026-04-02T00:00:00.000Z", status: "active", signerIdentity: env.evidenceSignerIdentity } }, rotation: { recommendedDays: 90, nextRotationReviewAt: null } }, retentionSchedules: schedules }; }
function resolveRetentionProfile(docType: string) { const settings = getRecordsGovernanceSettings(); const schedule = settings.retentionSchedules?.[docType] || settings.retentionSchedules?.default || { code: "ADMIN-5Y", years: 5, archiveTier: "standard" }; return { code: String(schedule.code || "ADMIN-5Y"), years: typeof schedule.years === "number" ? schedule.years : null, archiveTier: String(schedule.archiveTier || (settings.immutableArchiveTier || "immutable-worm")) }; }
function createTrustedTimestamp(payload: Record<string, unknown>) { const settings = getRecordsGovernanceSettings(); if (settings.trustedTimestamp?.enabled === false) return { token: null, at: null }; const token = crypto.createHash("sha256").update(JSON.stringify({ provider: settings.trustedTimestamp?.provider || env.evidenceTimestampProvider || "local-equivalent", payload, issuedAt: new Date().toISOString() })).digest("hex"); return { token: token.slice(0, 48), at: new Date().toISOString() }; }
function ledgerLinksForType(type: string) { return type === "accounting" ? ["AL-001", "DX-001"] : ["ML-001", "DX-001"]; }

export class DocumentRepository {
  listDocuments(context: RequestContext, query?: string) {
    const { trustId } = resolveTrustId(context); const q = query?.trim().toLowerCase(); const visible = scopeCollectionByTrust(db.documents, trustId);
    if (!q) return visible; return visible.filter((doc) => [doc.title, doc.displayId, doc.summary, doc.notes, ...(doc.tags || [])].join(" ").toLowerCase().includes(q));
  }
  findDocument(id: string, trustId: string) { return db.documents.find((doc) => doc.id === id && !doc.deletedAt && (doc.trustId === trustId)) || null; }
  async createDocument(context: RequestContext, input: Partial<DocumentRecord>) {
    const authAction = input.sourceType === "intake" || ["correspondence", "notice"].includes(input.docType || "") ? "intake.create" : "documents.create";
    assertAuthorized(context, authAction, "Creating documents");
    const precheck = governanceService.validateDocumentBeforeCreate(input);
    if (!precheck.valid) { const error = new Error(precheck.errors.join(" ")) as Error & { statusCode?: number }; error.statusCode = 400; throw error; }
    const { trustId } = resolveTrustId(context, input.trustId || null); const draft = precheck.governanceDraft; const docType = input.docType || "correspondence"; const status = input.status || "pending"; const jurisdiction = input.jurisdiction || "ADMINISTRATIVE"; const createdAt = new Date().toISOString(); const retention = resolveRetentionProfile(docType); const trustedTimestamp = createTrustedTimestamp({ title: input.title || "UNTITLED DOCUMENT", docType, trustId, createdAt });
    const immutable = Boolean(input.immutable ?? ["governing", "perfection"].includes(docType));
    const record: DocumentRecord = { id: crypto.randomUUID(), trustId, systemId: input.systemId || crypto.randomUUID(), displayId: input.displayId || draft.rdsCode || nextDisplayId(docType, db.documents.length), title: String(input.title || "UNTITLED DOCUMENT").trim(), exhibitCode: input.exhibitCode || draft.exhibitCode || nextExhibit(db.documents.length), docType, category: input.category || "administrative", status, jurisdiction, governingLevel: input.governingLevel || "supporting", sourceType: input.sourceType || "manual", summary: input.summary || "", notes: input.notes || "", effectiveDate: input.effectiveDate || new Date().toISOString().slice(0, 10), createdAt, updatedAt: createdAt, immutable, deletedAt: null, deletedBy: null, ledgerIds: input.ledgerIds || draft.suggestedLedgerCodes || ledgerLinksForType(docType), tags: input.tags || [docType.toUpperCase(), jurisdiction.toUpperCase(), status.toUpperCase()], fileName: input.fileName || null, originalFileName: input.originalFileName || null, mimeType: input.mimeType || null, fileSize: input.fileSize || null, fileHash: input.fileHash || null, storagePath: input.storagePath || null, sniffedMimeType: input.sniffedMimeType || null, uploadStatus: input.uploadStatus || null, quarantineReason: input.quarantineReason || null, metadataSignature: input.metadataSignature || null, metadataSignedAt: input.metadataSignedAt || null, metadataPayload: input.metadataPayload || null, indexingStatus: input.indexingStatus || null, ocrStatus: input.ocrStatus || null, extractedText: input.extractedText || null, legalHold: Boolean((input as any).legalHold ?? false), legalHoldReason: (input as any).legalHoldReason || null, retentionScheduleCode: (input as any).retentionScheduleCode || retention.code, retentionTrigger: (input as any).retentionTrigger || getRecordsGovernanceSettings().defaultRetentionTrigger, retentionDispositionAt: (input as any).retentionDispositionAt || addYearsIso(input.effectiveDate || new Date().toISOString().slice(0, 10), retention.years), archiveTier: (input as any).archiveTier || (immutable ? getRecordsGovernanceSettings().immutableArchiveTier : retention.archiveTier), archiveLockedAt: (input as any).archiveLockedAt || (immutable ? createdAt : null), trustedTimestampToken: (input as any).trustedTimestampToken || trustedTimestamp.token, trustedTimestampAt: (input as any).trustedTimestampAt || trustedTimestamp.at, checksumAlgorithm: (input as any).checksumAlgorithm || getRecordsGovernanceSettings().checksumAlgorithm, checksumVerifiedAt: (input as any).checksumVerifiedAt || ((input.fileHash || (input as any).storagePath) ? createdAt : null), watermarkTemplate: (input as any).watermarkTemplate || getRecordsGovernanceSettings().exportWatermarkTemplate, signatureKeyId: (input as any).signatureKeyId || String(getRecordsGovernanceSettings().manifestSigning?.activeKeyId || env.evidenceSigningKeyId) };
    db.documents.unshift(record); db.addAudit("DOCUMENT_CREATED", "document", record.id, null, record, undefined, getActor(context)); await db.persist("document-created"); await governanceService.registerDocumentArtifacts(context, record); return record;
  }
  async createUploadedDocument(context: RequestContext, input: { title?: string; docType?: string; jurisdiction?: string; status?: string; summary?: string; notes?: string; fileName: string; originalFileName: string; mimeType: string; tempPath: string; byteLength: number }) {
    assertAuthorized(context, "documents.create", "Uploading governed files");
    validateUploadMetadata({ fileName: input.originalFileName, mimeType: input.mimeType, byteLength: input.byteLength });
    recordSecurityEvent({ eventType: "documents.upload", outcome: "observed", severity: "low", actorRole: context.user.role, actorEmail: context.user.email, tenantId: context.user.tenantId, trustId: context.user.activeTrustId, recordType: "document", metadata: { declaredMimeType: input.mimeType, originalFileName: input.originalFileName, byteLength: input.byteLength } });
    const safeFileName = `${Date.now()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`; const absolutePath = path.join(env.uploadsDir, safeFileName); await fs.mkdir(env.uploadsDir, { recursive: true });
    const sniffedMimeType = await sniffContentType(input.tempPath); let quarantineReason: string | null = null;
    try { assertSniffedMimeAllowed(input.mimeType, sniffedMimeType); await runMalwareScan(input.tempPath); } catch (error: any) {
      quarantineReason = error.message || "Upload failed validation."; const quarantined = await quarantineFile(input.tempPath, quarantineReason || "Upload failed validation."); const uploadStatus = "quarantined" as const; const fileHash = await sha256File(quarantined.quarantinePath);
      recordSecurityEvent({ eventType: "documents.quarantine", outcome: "blocked", severity: "medium", actorRole: context.user.role, actorEmail: context.user.email, tenantId: context.user.tenantId, trustId: context.user.activeTrustId, recordType: "document", evidenceSignatureStatus: "pending-signature", metadata: { quarantineReason, sniffedMimeType, declaredMimeType: input.mimeType } });
      const metadataPayload: FileMetadataEnvelope = { originalFileName: input.originalFileName, storedFileName: path.basename(quarantined.quarantinePath), declaredMimeType: input.mimeType, sniffedMimeType, fileSize: input.byteLength, fileHash, uploadedAt: new Date().toISOString(), uploadStatus };
      const metadataSignature = signFileMetadata(metadataPayload);
      const document = await this.createDocument(context, { title: input.title || input.originalFileName, docType: input.docType || "correspondence", jurisdiction: input.jurisdiction || "ADMINISTRATIVE", status: "quarantined", summary: input.summary || "", notes: [input.notes || "", `QUARANTINE REASON: ${quarantineReason}`].filter(Boolean).join("\n"), sourceType: "upload", fileName: path.basename(quarantined.quarantinePath), originalFileName: input.originalFileName, mimeType: input.mimeType, fileSize: input.byteLength, fileHash, storagePath: quarantined.quarantinePath, sniffedMimeType, uploadStatus, quarantineReason, metadataPayload: metadataPayload as unknown as Record<string, unknown>, metadataSignature, metadataSignedAt: new Date().toISOString(), indexingStatus: "disabled", ocrStatus: "disabled" });
      const nextError = new Error(`Upload quarantined: ${quarantineReason}`) as Error & { statusCode?: number; payload?: unknown }; nextError.statusCode = 400; nextError.payload = { documentId: document.id, uploadStatus, quarantineReason }; throw nextError;
    }
    await fs.rename(input.tempPath, absolutePath).catch(async () => { await fs.copyFile(input.tempPath, absolutePath); await fs.rm(input.tempPath, { force: true }); });
    const fileHash = await sha256File(absolutePath); const extraction = await runOptionalExtraction(absolutePath, sniffedMimeType); const metadataPayload: FileMetadataEnvelope = { originalFileName: input.originalFileName, storedFileName: safeFileName, declaredMimeType: input.mimeType, sniffedMimeType, fileSize: input.byteLength, fileHash, uploadedAt: new Date().toISOString(), uploadStatus: "ready" };
    const metadataSignature = signFileMetadata(metadataPayload);
    recordSecurityEvent({ eventType: "documents.upload", outcome: "success", severity: "low", actorRole: context.user.role, actorEmail: context.user.email, tenantId: context.user.tenantId, trustId: context.user.activeTrustId, recordType: "document", evidenceSignatureStatus: metadataSignature ? "signed" : "unsigned", metadata: { sniffedMimeType, declaredMimeType: input.mimeType, storedFileName: safeFileName } });
    return this.createDocument(context, { title: input.title || input.originalFileName, docType: input.docType || "correspondence", jurisdiction: input.jurisdiction || "ADMINISTRATIVE", status: input.status || "pending", summary: input.summary || "", notes: input.notes || "", sourceType: "upload", fileName: safeFileName, originalFileName: input.originalFileName, mimeType: input.mimeType, fileSize: input.byteLength, fileHash, storagePath: absolutePath, sniffedMimeType, uploadStatus: "ready", quarantineReason: null, metadataPayload: metadataPayload as unknown as Record<string, unknown>, metadataSignature, metadataSignedAt: new Date().toISOString(), indexingStatus: extraction.indexingStatus, ocrStatus: extraction.ocrStatus, extractedText: extraction.extractedText, tags: [String(input.docType || "correspondence").toUpperCase(), "UPLOADED", sniffedMimeType.toUpperCase()] });
  }
  async getVerificationSummary(context: RequestContext, id: string) {
    assertAuthorized(context, "documents.read", "Inspecting checksum verification");
    const { trustId } = resolveTrustId(context); const document = this.findDocument(id, trustId); if (!document) throw new Error("Document not found.");
    const storagePresent = Boolean(document.storagePath && await fs.stat(document.storagePath).catch(() => null)); const currentChecksum = storagePresent && document.storagePath ? await sha256File(document.storagePath) : null;
    return { documentId: document.id, displayId: document.displayId, checksumAlgorithm: String(document.checksumAlgorithm || getRecordsGovernanceSettings().checksumAlgorithm), recordedChecksum: document.fileHash || null, currentChecksum, checksumMatches: document.fileHash && currentChecksum ? document.fileHash === currentChecksum : null, checksumVerifiedAt: document.checksumVerifiedAt || null, metadataSignaturePresent: Boolean(document.metadataSignature), trustedTimestampAt: document.trustedTimestampAt || null, trustedTimestampToken: document.trustedTimestampToken || null, archiveTier: document.archiveTier || null, archiveLockedAt: document.archiveLockedAt || null, legalHold: Boolean(document.legalHold), legalHoldReason: document.legalHoldReason || null, retentionScheduleCode: document.retentionScheduleCode || null, retentionDispositionAt: document.retentionDispositionAt || null, watermarkTemplate: document.watermarkTemplate || null, signatureKeyId: document.signatureKeyId || null, storagePresent };
  }


  async getVerificationReport(context: RequestContext, id: string) {
    const summary = await this.getVerificationSummary(context, id);
    const { trustId } = resolveTrustId(context);
    const document = this.findDocument(id, trustId);
    if (!document) {
      const error = new Error("Document not found.") as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }

    const generatedAt = new Date().toISOString();
    const reportCore = {
      generatedAt,
      verifierVersion: "trust-governance-ops-v2",
      trustId,
      document: {
        id: document.id,
        displayId: document.displayId,
        title: document.title,
        docType: document.docType,
        jurisdiction: document.jurisdiction,
        status: document.status,
        effectiveDate: document.effectiveDate,
        immutable: Boolean(document.immutable),
      },
      verification: summary,
      operatorChecklist: [
        { code: "checksum", status: summary.checksumMatches === false ? "fail" : summary.checksumMatches === true ? "pass" : "review", detail: summary.checksumMatches === false ? "Recorded checksum does not match the current file digest." : summary.recordedChecksum ? "Recorded checksum present." : "No recorded checksum was available for comparison." },
        { code: "metadata-signature", status: summary.metadataSignaturePresent ? "pass" : "review", detail: summary.metadataSignaturePresent ? "Signed metadata is present." : "Signed metadata is not available." },
        { code: "timestamp", status: summary.trustedTimestampAt ? "pass" : "review", detail: summary.trustedTimestampAt ? `Trusted timestamp recorded at ${summary.trustedTimestampAt}.` : "Trusted timestamp is not recorded." },
        { code: "storage", status: summary.storagePresent ? "pass" : "review", detail: summary.storagePresent ? "Attached storage object is present." : "Attached storage object is unavailable or not attached." },
        { code: "retention", status: summary.retentionScheduleCode ? "pass" : "review", detail: summary.retentionScheduleCode ? `Retention schedule ${summary.retentionScheduleCode} is assigned.` : "Retention schedule is not assigned." },
      ],
      supportBoundary: "Administrative governance and evidence control only. This report does not adjudicate legal rights or render legal advice.",
    };

    const reportHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(reportCore))
      .digest("hex");

    const report = {
      ...reportCore,
      reportId: `vr-${document.id}-${generatedAt.replace(/[^0-9]/g, "").slice(0, 14)}`,
      reportHash,
      exportName: `${document.displayId || document.id}-verification-report.json`,
    };

    recordSecurityEvent({
      eventType: "documents.verification.report",
      outcome: "success",
      severity: "low",
      actorRole: context.user.role,
      actorEmail: context.user.email,
      tenantId: context.user.tenantId,
      trustId,
      recordType: "document",
      recordId: document.id,
      evidenceSignatureStatus: summary.metadataSignaturePresent ? "signed" : "unsigned",
      metadata: { displayId: document.displayId, checksumMatches: summary.checksumMatches, storagePresent: summary.storagePresent },
    });

    return report;
  }
  async archiveDocument(context: RequestContext, id: string) {
    assertAuthorized(context, "documents.archive", "Archiving documents"); const { trustId } = resolveTrustId(context); const index = db.documents.findIndex((doc) => doc.id === id && !doc.deletedAt && doc.trustId === trustId); if (index < 0) throw new Error("Document not found.");
    const before = structuredClone(db.documents[index]); if (before.immutable) throw new Error("Immutable documents cannot be archived."); const after = { ...before, status: "archived", updatedAt: new Date().toISOString() };
    db.documents[index] = after; db.addAudit("DOCUMENT_ARCHIVED", "document", id, before, after, undefined, getActor(context)); await db.persist("document-archived"); return after;
  }
}

export const documentRepository = new DocumentRepository();
