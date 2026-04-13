import crypto from "node:crypto";
import type { ApprovalRecord, UserRole } from "../../models/domain.js";
import { db } from "../../store/governance-store.js";

function nowIso() {
  return new Date().toISOString();
}

export class ApprovalRepository {
  listAll(): ApprovalRecord[] {
    return db.approvals || [];
  }

  listByTrust(trustId: string): ApprovalRecord[] {
    return (db.approvals || []).filter((item) => item.trustId === trustId);
  }

  listForTarget(
    trustId: string,
    targetType: "distribution" | "packet",
    targetId: string,
  ): ApprovalRecord[] {
    return (db.approvals || []).filter(
      (item) =>
        item.trustId === trustId &&
        item.targetType === targetType &&
        item.targetId === targetId,
    );
  }

  countForTarget(
    trustId: string,
    targetType: "distribution" | "packet",
    targetId: string,
  ): number {
    return this.listForTarget(trustId, targetType, targetId).length;
  }

  create(params: {
    trustId: string;
    targetType: "distribution" | "packet";
    targetId: string;
    actorEmail: string;
    actorRole: UserRole;
    notes: string;
    reasonCode: string;
    stage: string;
    decision?: "approved" | "rejected";
  }): ApprovalRecord {
    const approval: ApprovalRecord = {
      id: crypto.randomUUID(),
      trustId: params.trustId,
      targetType: params.targetType,
      targetId: params.targetId,
      actionType: "approval",
      stage: params.stage,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      decision: params.decision || "approved",
      notes: params.notes,
      reasonCode: params.reasonCode,
      createdAt: nowIso(),
      immutable: true,
    };

    db.approvals = [approval, ...(db.approvals || [])];
    return approval;
  }

  async persist(reason: string) {
    await db.persist(reason);
  }
}

export const approvalRepository = new ApprovalRepository();
