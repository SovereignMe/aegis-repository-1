import path from "node:path";
import type { PacketRecord, RequestContext } from "../../models/domain.js";
import { db } from "../../store/governance-store.js";
import { governanceAuditWriter } from "./governance-audit-writer.js";
import { packetArtifactRepository } from "./packet-artifact-repository.js";
import { packetAssemblyService } from "./packet-assembly-service.js";
import { packetSigningService } from "./packet-signing-service.js";
import { packetRecordService } from "./packet-record-service.js";
import { assertDocumentsBelongToTrust, assertExhibitLinkageForDocuments, createManifestDeterminismHash } from "./governance-invariants.js";

export class PacketFinalizationService {
  async finalizePacketBuild(context: RequestContext, packet: PacketRecord, input: { packetType: PacketRecord["packetType"]; title: string; documentIds?: string[]; noticeIds?: string[]; trustId?: string | null }) {
    assertDocumentsBelongToTrust([...(packet.documentIds || []), ...(input.documentIds || [])], packet.trustId, "Packet document");
    const scopedDocuments = (db.documents || []).filter((item) => (packet.documentIds || []).includes(item.id) && item.trustId === packet.trustId && !item.deletedAt);
    assertExhibitLinkageForDocuments(scopedDocuments, packet.trustId);
    const assembly = await packetAssemblyService.assemblePacket(context, packet, input);
    const signing = await packetSigningService.writePacketSignatures(assembly);
    const bundle = await packetSigningService.packageBundle({ ...assembly, packetId: packet.id, trustId: packet.trustId, manifestHash: assembly.manifestHash });

    const immutableTargets = [
      path.join(assembly.recordsDir, "manifest.json"),
      path.join(assembly.recordsDir, "records.json"),
      path.join(assembly.bundleDir, "manifest.sig"),
      path.join(assembly.bundleDir, "bundle.sig"),
      path.join(assembly.bundleDir, "timestamp.json"),
      path.join(assembly.bundleDir, "included-files.json"),
      path.join(assembly.bundleDir, "VERIFICATION.json"),
      path.join(assembly.bundleDir, "COMPLIANCE-DISCLAIMER.txt"),
      path.join(assembly.bundleDir, "EXPORT-WATERMARK.txt"),
      path.join(assembly.bundleDir, "jurisdiction-hints.json"),
      bundle.bundlePath,
    ];
    if (bundle.anchorReceipt) immutableTargets.push(path.join(assembly.bundleDir, "anchor-receipt.txt"), path.join(assembly.bundleDir, "anchor-verification.json"));
    await packetSigningService.applyImmutableRetention(immutableTargets);

    const packetRecord = { ...packetRecordService.createFinalPacketRecord(context, packet, input, assembly, signing, bundle), manifestHash: createManifestDeterminismHash(packet) };
    packetArtifactRepository.savePacket(packetRecord);
    governanceAuditWriter.writePacketGenerated(context, packet, packetRecord, {
      manifestPath: packetRecord.manifestPath,
      bundlePath: bundle.bundlePath,
      bundleHash: bundle.bundleHash,
      anchored: Boolean(bundle.anchorReceipt),
      publicProofStatus: bundle.verification?.status || 'pending',
      keyId: packetRecord.manifestKeyId,
    });
    await db.withPersistenceBoundary("packet-generated", async () => undefined);
    return {
      packet: packetRecord,
      manifest: assembly.evidenceManifest,
      evidenceManifest: assembly.evidenceManifest,
      detachedSignature: signing.detachedSignature,
      bundleSignature: bundle.bundleSignaturePayload,
      timestamp: signing.timestampPayload,
      includedFiles: assembly.includedFiles,
      verificationSummary: signing.verificationSummary,
    };
  }
}

export const packetFinalizationService = new PacketFinalizationService();
