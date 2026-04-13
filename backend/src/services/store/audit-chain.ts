import { createHash, randomUUID } from "node:crypto";
import type { AuditRecord, AuditVerification } from "../../models/domain.js";

function nowIso() {
  return new Date().toISOString();
}

export function stableStringify(input: unknown): string {
  if (input === null || input === undefined) return "null";
  if (Array.isArray(input)) return `[${input.map((item) => stableStringify(item)).join(",")}]`;
  if (typeof input === "object") {
    const entries = Object.entries(input as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, value]) => `${JSON.stringify(key)}:${stableStringify(value)}`).join(",")}}`;
  }
  return JSON.stringify(input);
}

export function createAuditRecord(existingAudit: AuditRecord[], action: string, entityType: string, entityId: string | null, before?: unknown, after?: unknown, metadata?: Record<string, unknown>, actor = "SYSTEM"): AuditRecord {
  const latest = existingAudit[0] || null;
  const sequence = latest ? latest.sequence + 1 : 1;
  const createdAt = nowIso();
  const previousHash = latest?.hash || null;
  const payload = `${sequence}|${actor}|${entityType}|${entityId || ""}|${action}|${createdAt}|${stableStringify(before)}|${stableStringify(after)}|${stableStringify(metadata || null)}|${previousHash || ""}`;
  const hash = createHash("sha256").update(payload).digest("hex");
  return { id: randomUUID(), actor, entityType, entityId, action, before, after, metadata, createdAt, sequence, previousHash, hash };
}

export function verifyAuditEntries(entries: AuditRecord[]): AuditVerification {
  const issues: string[] = [];
  const ordered = [...entries].sort((a, b) => a.sequence - b.sequence);
  let priorHash: string | null = null;
  for (const entry of ordered) {
    if (entry.previousHash !== priorHash) issues.push(`Sequence ${entry.sequence} previous hash mismatch.`);
    const payload: string = `${entry.sequence}|${entry.actor}|${entry.entityType}|${entry.entityId || ""}|${entry.action}|${entry.createdAt}|${stableStringify(entry.before)}|${stableStringify(entry.after)}|${stableStringify(entry.metadata || null)}|${entry.previousHash || ""}`;
    const recalculated: string = createHash("sha256").update(payload).digest("hex");
    if (recalculated !== entry.hash) issues.push(`Sequence ${entry.sequence} content hash mismatch.`);
    priorHash = entry.hash;
  }
  return { valid: issues.length === 0, checkedAt: nowIso(), length: entries.length, headHash: entries[0]?.hash || null, issues };
}
