import { storageService } from "./storageService";

export interface AuditEventInput {
  actor?: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, any>;
}

export interface AuditEventRecord extends AuditEventInput {
  id: string;
  createdAt: string;
}

export function makeAuditEvent({ actor = "SYSTEM", entityType, entityId = null, action, before = null, after = null, metadata = {} }: AuditEventInput): AuditEventRecord {
  return {
    id: crypto.randomUUID(),
    actor,
    entityType,
    entityId,
    action,
    before,
    after,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

export async function appendAuditEvent(event: AuditEventRecord): Promise<AuditEventRecord> {
  await storageService.put("audit", event);
  return event;
}
