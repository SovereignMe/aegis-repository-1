import type { BeneficiaryRecord, PacketRecord, RequestContext } from "../../models/domain.js";
import { auditChainWriter } from "../audit/audit-chain-writer.js";
import { getActor } from "../../services/authorization.service.js";

export class GovernanceAuditWriter {
  writeBeneficiaryCreated(context: RequestContext, record: BeneficiaryRecord) {
    auditChainWriter.write("BENEFICIARY_CREATED", "beneficiary", record.id, null, record, undefined, getActor(context));
  }

  writePacketIssuanceRequested(context: RequestContext, packet: PacketRecord, requiredApprovals: number) {
    auditChainWriter.write("PACKET_ISSUANCE_REQUESTED", "packet", packet.id, null, packet, { requiredApprovals }, getActor(context));
  }

  writePacketApprovalRecorded(context: RequestContext, before: PacketRecord, after: PacketRecord, approvalId: string, approvalCount: number, requiredApprovals: number) {
    auditChainWriter.write("PACKET_APPROVAL_RECORDED", "packet", after.id, before, after, { approvalId, approvalCount, requiredApprovals }, getActor(context));
  }

  writePacketApproved(context: RequestContext, before: PacketRecord, after: PacketRecord, approvalId: string, approvalCount: number) {
    auditChainWriter.write("PACKET_APPROVED", "packet", before.id, before, after, { approvalId, approvalCount }, getActor(context));
  }

  writePacketGenerated(context: RequestContext, before: PacketRecord, after: PacketRecord, metadata: Record<string, unknown>) {
    auditChainWriter.write("PACKET_GENERATED", "packet", after.id, before, after, metadata, getActor(context));
  }
}

export const governanceAuditWriter = new GovernanceAuditWriter();
