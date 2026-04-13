import fs from "node:fs/promises";
import path from "node:path";
import type { PacketRecord, RequestContext } from "../../models/domain.js";
import { env } from "../../config/env.js";
import { db } from "../../store/governance-store.js";
import { buildComplianceDisclaimer } from "./packet-manifest-builder.js";
import { getRecordsGovernanceSettings, inferJurisdictionHints, renderWatermark } from "./governance-policy-service.js";
import { packetArtifactRepository } from "./packet-artifact-repository.js";
import { packetSourceQueryRepository } from "./packet-source-query-repository.js";
import { canonicalize, setImmutableReadOnly, sha256Path, sha256Text } from "./bundle-signer.js";

function slug(input: string) { return input.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "UNTITLED"; }

export class PacketAssemblyService {
  async assemblePacket(context: RequestContext, packet: PacketRecord, input: { packetType: PacketRecord["packetType"]; title: string; documentIds?: string[]; noticeIds?: string[] }) {
    const generatedAt = new Date().toISOString();
    const scopedTrustId = packet.trustId;
    const { trust: trustRecord, documents, notices, ledgerEntries, exhibits, authorityChain, accountingEntries } = packetSourceQueryRepository.getAssemblyInputs({ trustId: scopedTrustId, documentIds: input.documentIds || [], noticeIds: input.noticeIds || [] });
    const dominantJurisdiction = trustRecord?.jurisdiction || documents[0]?.jurisdiction || "ADMINISTRATIVE";
    const jurisdictionHints = inferJurisdictionHints(dominantJurisdiction);
    const complianceDisclaimer = buildComplianceDisclaimer(input.packetType, trustRecord?.trustName || "Active trust", dominantJurisdiction);
    const recordsGovernance = getRecordsGovernanceSettings();
    const packetCode = packet.packetCode;
    const packetId = packet.id;
    const bundleSlug = `${Date.now()}-${slug(input.title)}-${packetCode}`;
    const exportWatermark = renderWatermark(recordsGovernance.exportWatermarkTemplate, { displayId: packetCode, packetCode, generatedAt, trustName: trustRecord?.trustName || "HLH FUTURE INVESTMENT TRUST" });
    const { bundleDir, recordsDir, filesDir } = await packetArtifactRepository.ensureBundleDirectories(bundleSlug);
    const timestampPayloadBase = { packetCode, packetId, generatedAt, generatedEpochMs: Date.now(), timezone: "UTC" };
    const evidenceManifest = {
      schemaVersion: 2,
      packetId,
      packetCode,
      packetType: input.packetType,
      title: input.title,
      generatedAt,
      generatedBy: context.user.email,
      immutable: true,
      trustId: scopedTrustId,
      legalPositioning: { workflowSupportOnly: true, determinesLegalSufficiency: false, disclaimer: complianceDisclaimer },
      jurisdictionHints,
      auditHeadHash: db.audit[0]?.hash || null,
      auditLength: db.audit.length,
      timestamp: timestampPayloadBase,
      chainOfCustody: { generatedBy: context.user.email, generatedAt, sourceSystem: env.appName },
      recordsGovernance: {
        legalHoldReview: true,
        exportWatermark,
        immutableArchiveTier: recordsGovernance.immutableArchiveTier,
        checksumAlgorithm: recordsGovernance.checksumAlgorithm,
        manifestSigning: { algorithm: recordsGovernance.manifestSigning?.algorithm || "Ed25519", activeKeyId: recordsGovernance.manifestSigning?.activeKeyId || env.evidenceSigningKeyId },
      },
      includedRecords: {
        documentIds: documents.map((item) => item.id),
        noticeIds: notices.map((item) => item.id),
        ledgerEntryIds: ledgerEntries.map((item) => item.id),
        exhibitIds: exhibits.map((item) => item.id),
      },
      documents,
      notices,
      ledgerEntries,
      exhibits,
      authorityChain,
      accountingEntries,
    };
    const records = {
      manifest: evidenceManifest,
      documents,
      notices,
      ledgerEntries,
      exhibits,
      authorityChain,
      accountingEntries,
      auditVerification: packetSourceQueryRepository.getAuditVerification(scopedTrustId),
      legalPositioning: { workflowSupportOnly: true, determinesLegalSufficiency: false, disclaimer: complianceDisclaimer },
      jurisdictionHints,
    };

    await packetArtifactRepository.writeJson(path.join(recordsDir, "manifest.json"), evidenceManifest);
    await packetArtifactRepository.writeJson(path.join(recordsDir, "records.json"), records);
    await packetArtifactRepository.writeText(path.join(bundleDir, "COMPLIANCE-DISCLAIMER.txt"), complianceDisclaimer);
    await packetArtifactRepository.writeText(path.join(bundleDir, "EXPORT-WATERMARK.txt"), exportWatermark);
    await packetArtifactRepository.writeJson(path.join(bundleDir, "jurisdiction-hints.json"), jurisdictionHints);

    const includedFiles: Array<Record<string, unknown>> = [];
    for (const document of documents) {
      if (!document.storagePath) continue;
      const existing = await fs.stat(document.storagePath).catch(() => null);
      if (!existing) continue;
      const safeName = `${document.displayId || document.id}-${(document.originalFileName || document.fileName || "attachment").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const destination = path.join(filesDir, safeName);
      await fs.copyFile(document.storagePath, destination);
      const fileHash = await sha256Path(destination);
      includedFiles.push({
        documentId: document.id,
        displayId: document.displayId,
        originalFileName: document.originalFileName || document.fileName,
        bundledFileName: safeName,
        sha256: fileHash,
        bytes: existing.size,
      });
      await setImmutableReadOnly(destination);
    }

    const manifestHash = sha256Text(canonicalize(evidenceManifest));

    return {
      generatedAt,
      trustRecord,
      documents,
      notices,
      ledgerEntries,
      exhibits,
      authorityChain,
      accountingEntries,
      recordsGovernance,
      packetCode,
      packetId,
      bundleSlug,
      exportWatermark,
      bundleDir,
      recordsDir,
      filesDir,
      timestampPayloadBase,
      evidenceManifest,
      records,
      includedFiles,
      manifestHash,
      complianceDisclaimer,
      jurisdictionHints,
    };
  }
}

export const packetAssemblyService = new PacketAssemblyService();
