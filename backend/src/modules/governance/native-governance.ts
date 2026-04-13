import type { DistributionRecord, DocumentRecord, NoticeRecord, PacketManifestSummary, PacketRecord, RequestContext } from "../../models/domain.js";
import { assertAuthorized } from "../../services/authorization.service.js";
import { db } from "../../store/governance-store.js";
import { resolveTrustId } from "../../services/tenancy.service.js";
import { governanceAuditWriter } from "./governance-audit-writer.js";
import { packetArtifactRepository } from "./packet-artifact-repository.js";
import { packetFinalizationService } from "./packet-finalization-service.js";
import { distributionRepository } from "../distributions/repositories.js";
import { noticeRepository } from "../notices/repositories.js";
import { governanceOverviewService } from "./governance-overview-service.js";
import { documentGovernanceService } from "./document-governance-service.js";
import { packetApprovalService } from "./packet-approval-service.js";
import { policyVersionService } from "./policy-version-service.js";
import { artifactStatusRepository } from "../artifacts/artifact-status-repository.js";

export class GovernanceService {
  getOverview(context: RequestContext) {
    return governanceOverviewService.getOverview(context);
  }

  buildDocumentGovernanceDraft(input: Partial<DocumentRecord>) {
    return documentGovernanceService.buildDocumentGovernanceDraft(input);
  }

  validateDocumentBeforeCreate(input: Partial<DocumentRecord>) {
    return documentGovernanceService.validateDocumentBeforeCreate(input);
  }

  async registerDocumentArtifacts(context: RequestContext, document: DocumentRecord) {
    return documentGovernanceService.registerDocumentArtifacts(context, document);
  }

  async requestDistribution(context: RequestContext, input: Partial<DistributionRecord>) {
    const beneficiary = (db.beneficiaries || []).find((item) => item.id === input.beneficiaryId && !item.deletedAt);
    if (!beneficiary) throw new Error("Beneficiary not found.");
    const result = await distributionRepository.requestDistribution(context, {
      ...input,
      trustId: resolveTrustId(context, input.trustId || beneficiary.trustId || null).trustId,
      beneficiaryId: beneficiary.id,
      category: input.category || "general-support",
      requestedByRole: context.user.role,
      reasonCode: (input as any).reasonCode || null,
    } as any);
    return (result as any).distribution || result;
  }

  async approveDistribution(context: RequestContext, id: string, input: { notes: string; reasonCode: string }) {
    return await distributionRepository.approveDistribution(context, id, input);
  }

  async createNotice(context: RequestContext, input: Partial<NoticeRecord>) {
    return await noticeRepository.createNotice(context, { ...input, trustId: resolveTrustId(context, input.trustId || null).trustId });
  }

  async serveNotice(context: RequestContext, id: string, trackingNumber?: string | null) {
    return await noticeRepository.serveNotice(context, id, trackingNumber);
  }

  async buildPacket(context: RequestContext, input: { packetType: PacketRecord["packetType"]; title: string; documentIds?: string[]; noticeIds?: string[]; trustId?: string | null; notes?: string; reasonCode?: string }) {
    const { packet, requiredApprovals } = packetApprovalService.createPacketDraft(context, input);
    const pendingResult = await packetApprovalService.persistPacketDraft(context, packet, requiredApprovals);
    if (pendingResult) return pendingResult;
    const finalized = await this.finalizePacketBuild(context, packet, input);
    await db.withPersistenceBoundary("packet-generated-immediate", async () => undefined);
    return finalized;
  }

  async approvePacket(context: RequestContext, id: string, input: { notes: string; reasonCode: string }) {
    const approvalState = await packetApprovalService.approvePacketRequest(context, id, input);
    if (approvalState.pending) {
      return { packet: approvalState.packet, approval: approvalState.approval, pendingApprovalsRemaining: approvalState.requiredApprovals - approvalState.approvalCount };
    }
    const result = await this.finalizePacketBuild(context, approvalState.packet, { packetType: approvalState.packet.packetType, title: approvalState.packet.title, documentIds: approvalState.packet.documentIds, noticeIds: approvalState.packet.noticeIds, trustId: approvalState.packet.trustId });
    governanceAuditWriter.writePacketApproved(context, approvalState.before, result.packet, approvalState.approval.id, approvalState.approvalCount);
    await db.withPersistenceBoundary("packet-approved", async () => undefined);
    return { ...result, approval: approvalState.approval };
  }

  private async finalizePacketBuild(context: RequestContext, packet: PacketRecord, input: { packetType: PacketRecord["packetType"]; title: string; documentIds?: string[]; noticeIds?: string[]; trustId?: string | null }) {
    return packetFinalizationService.finalizePacketBuild(context, packet, input);
  }

  async getPacketManifestSummary(context: RequestContext, id: string): Promise<PacketManifestSummary & { manifest?: unknown; verification?: unknown }> {
    assertAuthorized(context, "governance.packet", "Inspecting packet manifest verification");
    const packet = packetArtifactRepository.findActivePacketById(id);
    if (!packet) {
      const error: any = new Error("Packet not found.");
      error.statusCode = 404;
      throw error;
    }
    const manifest = await packetArtifactRepository.readJsonIfPresent(packet.manifestPath);
    const verification = await packetArtifactRepository.readJsonIfPresent(packet.verificationSummaryPath);
    return {
      packetId: packet.id,
      packetCode: packet.packetCode,
      manifestPath: packet.manifestPath || null,
      verificationSummaryPath: packet.verificationSummaryPath || null,
      manifestHash: packet.manifestHash || null,
      manifestSignature: packet.manifestSignature || null,
      manifestKeyId: packet.manifestKeyId || null,
      exportWatermark: packet.exportWatermark || null,
      timestampToken: packet.timestampToken || null,
      timestampAuthority: packet.timestampAuthority || null,
      anchoredAt: packet.anchoredAt || null,
      manifest,
      verification,
      artifactStatus: artifactStatusRepository.findByPacketId(packet.id),
    };
  }

  listPolicyVersions(context: RequestContext) {
    return policyVersionService.listPolicyVersions(context);
  }

  async createPolicyVersion(context: RequestContext, input: { policyType: any; title: string; policyKey?: string; content: Record<string, unknown>; changeSummary?: string; activate?: boolean }) {
    return policyVersionService.createPolicyVersion(context, input);
  }

  async activatePolicyVersion(context: RequestContext, policyType: any, versionId: string) {
    return policyVersionService.activatePolicyVersion(context, policyType, versionId);
  }


  getPacketArtifactStatus(context: RequestContext, id: string) {
    assertAuthorized(context, "governance.packet", "Inspecting packet artifact integrity status");
    const packet = packetArtifactRepository.findActivePacketById(id);
    if (!packet) {
      const error = new Error("Packet not found.") as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
    return artifactStatusRepository.findByPacketId(id) || { packetId: id, status: 'pending', verificationStatus: 'pending' };
  }

  getPacketBundle(context: RequestContext, id: string) {
    assertAuthorized(context, "governance.packet", "Downloading evidence bundles");
    const packet = packetArtifactRepository.findPacketById(id);
    if (!packet?.bundlePath) {
      const error = new Error("Packet bundle is unavailable.") as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
    return packet;
  }
}

export const governanceService = new GovernanceService();
