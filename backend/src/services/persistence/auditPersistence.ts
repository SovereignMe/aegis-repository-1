import type { Pool, PoolClient } from "pg";
import type { AuditRecord } from "../../models/domain.js";

export async function loadAuditState(pool: Pool): Promise<{ audit: AuditRecord[] }> {
  const auditRows = await pool.query(`SELECT id, tenant_id AS "tenantId", trust_id AS "trustId", actor, entity_type AS "entityType", entity_id AS "entityId", action, before_json AS before, after_json AS after, metadata_json AS metadata, created_at AS "createdAt", sequence, previous_hash AS "previousHash", hash FROM audit_events ORDER BY sequence DESC`);
  return { audit: auditRows.rows };
}

export async function persistAuditState(
  client: PoolClient,
  audit: AuditRecord[],
  resolveTenantIdForTrust: (trustId?: string | null) => string,
) {
  for (const entry of [...audit].reverse()) {
    await client.query(`INSERT INTO audit_events (id, tenant_id, trust_id, sequence, actor, entity_type, entity_id, action, before_json, after_json, metadata_json, created_at, previous_hash, hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14) ON CONFLICT (id) DO NOTHING`, [entry.id, entry.tenantId || resolveTenantIdForTrust(entry.trustId || (entry.metadata as any)?.trustId || (entry.after as any)?.trustId || (entry.before as any)?.trustId || null), entry.trustId || (entry.metadata as any)?.trustId || (entry.after as any)?.trustId || (entry.before as any)?.trustId || null, entry.sequence, entry.actor, entry.entityType, entry.entityId || null, entry.action, entry.before === undefined ? null : JSON.stringify(entry.before), entry.after === undefined ? null : JSON.stringify(entry.after), entry.metadata === undefined ? null : JSON.stringify(entry.metadata), entry.createdAt, entry.previousHash || null, entry.hash]);
  }
}
