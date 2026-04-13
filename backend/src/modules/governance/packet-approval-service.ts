import crypto from "node:crypto";
import type { PacketRecord, RequestContext } from "../../models/domain.js";
import { assertAuthorized } from "../../services/authorization.service.js";
import { withUnitOfWork } from "../../store/unit-of-work.js";
import { lockPacketRow } from "../../store/postgres-locks.js";
import { resolveTrustId } from "../../services/tenancy.service.js";
import { governanceAuditWriter } from "./governance-audit-writer.js";
import { assertMakerCheckerSeparation, assertRecordTrustAccess } from "../../services/trust-boundary.service.js";
import { assertDualControl, packetRequiredApprovals, requireApprovalMemo } from "./governance-policy-service.js";
import { packetArtifactRepository } from "./packet-artifact-repository.js";
import { approvalRepository } from "./approval-repository.js";
import { recordSecurityEvent } from "../../services/observability.service.js";
import { assertDocumentsBelongToTrust, createManifestDeterminismHash } from "./governance-invariants.js";
import { assertQuorumSatisfied, evaluateQuorum, type ApprovalVote } from "./quorum-policy.js";

function nowIso() { return new Date().toISOString(); }
function sequence(prefix: string, count: number) { return `${prefix}-${String(count + 1).padStart(4, "0")}`; }

export class PacketApprovalService {
  createPacketDraft(context: RequestContext, input: { packetType: PacketRecord["packetType"]; title: string; documentIds?: string[]; noticeIds?: string[]; trustId?: string | null; notes?: string; reasonCode?: string }) {
    assertAuthorized(context, "governance.packet", "Building packet exports");
    requireApprovalMemo({ notes: input.notes || "", reasonCode: input.reasonCode || "" }, "Packet issuance request");
    const scopedTrustId = resolveTrustId(context, input.trustId || null).trustId;
    const requiredApprovals = packetRequiredApprovals(input.packetType);
    assertDocumentsBelongToTrust([...(input.documentIds || [])], scopedTrustId, "Packet document");
    return {
      packet: {
        id: crypto.randomUUID(),
        trustId: scopedTrustId,
        packetCode: sequence(input.packetType === "administrative-record" ? "ARP" : "EVP", packetArtifactRepository.listPackets().length),
        packetType: input.packetType,
        title: input.title,
        status: requiredApprovals > 0 ? "pending_approval" : "generated",
        documentIds: [...(input.documentIds || [])],
        noticeIds: [...(input.noticeIds || [])],
        ledgerEntryIds: [],
        exhibitIds: [],
        generatedAt: nowIso(),
        generatedBy: context.user.email,
        generatedByRole: context.user.role,
        reasonCode: input.reasonCode || null,
        notes: input.notes || null,
        requiredApprovals,
        approvalCount: 0,
        immutable: false,
        manifestHash: null,
        versionNo: 1,
      } satisfies PacketRecord,
      requiredApprovals,
    };
  }

  async persistPacketDraft(context: RequestContext, packet: PacketRecord, requiredApprovals: number) {
    packetArtifactRepository.savePacket(packet);
    if (requiredApprovals > 0) {
      governanceAuditWriter.writePacketIssuanceRequested(context, packet, requiredApprovals);
      return { packet, pendingApprovalsRemaining: requiredApprovals };
    }
    return null;
  }

  async approvePacketRequest(context: RequestContext, id: string, input: { notes: string; reasonCode: string }) {
    assertAuthorized(context, "governance.packet", "Approving packet issuance");
    requireApprovalMemo(input, "Packet approval");

    return withUnitOfWork("approve-packet", async (client) => {
      const scopedTrustId = resolveTrustId(context).trustId;
      const index = packetArtifactRepository.findPacketIndex(id, scopedTrustId);
      if (index < 0) throw new Error("Packet not found.");
      const scopedPacket = packetArtifactRepository.findActivePacketById(id, scopedTrustId);
      if (!scopedPacket) throw new Error("Packet not found.");
      const locked = client ? await lockPacketRow(client, id) : null;
      const before = structuredClone(locked || scopedPacket);
      if (before.status !== "pending_approval") throw new Error("Only pending packet issuance requests can be approved.");
      assertRecordTrustAccess(context, before, "Packet");
      assertDualControl(before.generatedBy, context.user.email, "Packet approval");
      assertMakerCheckerSeparation(context, before, "Packet approval", { enforceRoleSeparation: true });
      const approval = approvalRepository.create({ trustId: before.trustId, targetType: "packet", targetId: before.id, actorEmail: context.user.email, actorRole: context.user.role, notes: String(input.notes || ""), reasonCode: String(input.reasonCode || ""), stage: `packet-approval-${(before.approvalCount || 0) + 1}` });
      const approvalCount = approvalRepository.countForTarget(before.trustId, "packet", before.id);
      const requiredApprovals = Math.max(1, Number(before.requiredApprovals || 1));
      const approvalVotes: ApprovalVote[] = approvalRepository.listForTarget(before.trustId, "packet", before.id).map((entry) => ({ actorId: entry.actorEmail, actorRole: entry.actorRole, decision: "approved" as const }));
      const quorum = evaluateQuorum({ minimumApprovals: requiredApprovals, uniqueActorsOnly: true }, approvalVotes);
      const manifestHash = createManifestDeterminismHash(before);
      if (!quorum.satisfied) {
        const updatedPending = { ...before, approvalCount, status: "pending_approval" as const, manifestHash, versionNo: Number(before.versionNo || 1) + 1 };
        recordSecurityEvent({ eventType: "governance.packet.approval", outcome: "observed", severity: "low", actorRole: context.user.role, actorEmail: context.user.email, tenantId: context.user.tenantId, trustId: before.trustId, recordType: "packet", recordId: before.id, packetId: before.id, approvalState: `pending-${approvalCount}-of-${requiredApprovals}`, metadata: { stage: approval.stage, packetCode: before.packetCode } });
        packetArtifactRepository.updatePacketAt(index, updatedPending);
        governanceAuditWriter.writePacketApprovalRecorded(context, before, updatedPending, approval.id, approvalCount, requiredApprovals);
        return { pending: true, before, approval, approvalCount, requiredApprovals, quorum, packet: updatedPending };
      }
      assertQuorumSatisfied({ minimumApprovals: requiredApprovals, uniqueActorsOnly: true }, approvalVotes, "packet approval");
      recordSecurityEvent({ eventType: "governance.packet.approval", outcome: "success", severity: "low", actorRole: context.user.role, actorEmail: context.user.email, tenantId: context.user.tenantId, trustId: before.trustId, recordType: "packet", recordId: before.id, packetId: before.id, approvalState: `approved-${approvalCount}-of-${requiredApprovals}`, metadata: { stage: approval.stage, packetCode: before.packetCode, quorumSatisfied: true } });
      return { pending: false, before, approval, approvalCount, requiredApprovals, quorum, packet: { ...before, approvalCount, manifestHash, versionNo: Number(before.versionNo || 1) + 1 } };
    });
  }
}

export const packetApprovalService = new PacketApprovalService();
