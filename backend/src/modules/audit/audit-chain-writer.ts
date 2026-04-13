import { db } from "../../store/governance-store.js";

export class AuditChainWriter {
  write(action: string, entityType: string, entityId: string | null, before: unknown, after: unknown, metadata: Record<string, unknown> | undefined, actor = "SYSTEM") {
    return db.addAudit(action, entityType, entityId, before, after, metadata, actor);
  }
}

export const auditChainWriter = new AuditChainWriter();
