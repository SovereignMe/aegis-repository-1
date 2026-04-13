import fs from "node:fs/promises";
import { db } from "../../store/governance-store.js";
import { sha256File } from "../../services/uploadSecurity.service.js";

export class RepositoryRecordRepository {
  findDocument(id: string, trustId: string) {
    return db.documents.find((doc) => doc.id === id && !doc.deletedAt && (doc.trustId === trustId)) || null;
  }
  async getVerificationSummary(_context: any, id: string) {
    const trustId = String(_context?.user?.activeTrustId || "");
    const document = this.findDocument(id, trustId);
    if (!document) throw new Error("Document not found.");
    const storagePresent = Boolean(document.storagePath && await fs.stat(document.storagePath).catch(() => null));
    const currentChecksum = storagePresent && document.storagePath ? await sha256File(document.storagePath) : null;
    return { documentId: document.id, displayId: document.displayId, checksumAlgorithm: String(document.checksumAlgorithm || "sha256"), recordedChecksum: document.fileHash || null, currentChecksum, checksumMatches: document.fileHash && currentChecksum ? document.fileHash === currentChecksum : null, checksumVerifiedAt: document.checksumVerifiedAt || null, metadataSignaturePresent: Boolean(document.metadataSignature), trustedTimestampAt: document.trustedTimestampAt || null, trustedTimestampToken: document.trustedTimestampToken || null, archiveTier: document.archiveTier || null, archiveLockedAt: document.archiveLockedAt || null, legalHold: Boolean(document.legalHold), legalHoldReason: document.legalHoldReason || null, retentionScheduleCode: document.retentionScheduleCode || null, retentionDispositionAt: document.retentionDispositionAt || null, watermarkTemplate: document.watermarkTemplate || null, signatureKeyId: document.signatureKeyId || null, storagePresent };
  }
}

export const repositoryRecordRepository = new RepositoryRecordRepository();
