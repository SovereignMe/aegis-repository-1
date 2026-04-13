import path from "node:path";
import type { PacketRecord, RequestContext } from "../../models/domain.js";

export class PacketRecordService {
  createFinalPacketRecord(context: RequestContext, packet: PacketRecord, input: { packetType: PacketRecord["packetType"]; title: string }, assembly: any, signing: any, bundle: any): PacketRecord {
    return {
      id: assembly.packetId,
      trustId: packet.trustId,
      packetCode: assembly.packetCode,
      packetType: input.packetType,
      title: input.title,
      status: bundle.anchorReceipt ? "anchored" : "generated",
      documentIds: assembly.documents.map((item: any) => item.id),
      noticeIds: assembly.notices.map((item: any) => item.id),
      ledgerEntryIds: assembly.ledgerEntries.map((item: any) => item.id),
      exhibitIds: assembly.exhibits.map((item: any) => item.id),
      generatedAt: assembly.generatedAt,
      generatedBy: context.user.email,
      generatedByRole: context.user.role,
      reasonCode: packet.reasonCode || null,
      notes: packet.notes || null,
      requiredApprovals: packet.requiredApprovals,
      approvalCount: packet.approvalCount,
      manifestPath: path.join(assembly.recordsDir, "manifest.json"),
      bundleDir: assembly.bundleDir,
      bundlePath: bundle.bundlePath,
      manifestSignature: signing.detachedSignature.signature,
      bundleSignature: bundle.bundleSignaturePayload.signature,
      manifestHash: assembly.manifestHash,
      bundleHash: bundle.bundleHash,
      timestampPath: path.join(assembly.bundleDir, "timestamp.json"),
      timestampToken: String(signing.timestampPayload.token || "") || null,
      timestampAuthority: String(signing.timestampPayload.issuedBy),
      manifestKeyId: signing.detachedSignature.keyId,
      verificationSummaryPath: path.join(assembly.bundleDir, "VERIFICATION.json"),
      exportWatermark: assembly.exportWatermark,
      anchoredAt: bundle.anchorReceipt ? assembly.generatedAt : null,
      hashAnchorReceipt: bundle.anchorReceipt,
      immutable: true,
    };
  }
}

export const packetRecordService = new PacketRecordService();
