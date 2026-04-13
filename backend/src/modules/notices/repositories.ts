import crypto from "node:crypto";
import type { NoticeRecord, RequestContext } from "../../models/domain.js";
import { assertAuthorized, getActor } from "../../services/authorization.service.js";
import { db } from "../../store/governance-store.js";
import { resolveTrustId } from "../../services/tenancy.service.js";
import { assertRecordTrustAccess } from "../../services/trust-boundary.service.js";

function nowIso() { return new Date().toISOString(); }
function sequence(prefix: string, count: number) { return `${prefix}-${String(count + 1).padStart(4, "0")}`; }

export class NoticeRepository {
  listByTrust(trustId: string) { return (db.notices || []).filter((item) => item.trustId === trustId && !item.deletedAt); }
  listActiveByIds(ids: string[]) { const idSet = new Set(ids); return (db.notices || []).filter((item) => !item.deletedAt && idSet.has(item.id)); }
  findActiveIndex(id: string) { return (db.notices || []).findIndex((item) => item.id === id && !item.deletedAt); }
  updateAt(index: number, record: NoticeRecord) { const items = db.notices || []; items[index] = record; db.notices = items; return record; }
  async createNotice(context: RequestContext, input: Partial<NoticeRecord>) {
    assertAuthorized(context, "notices.write", "Creating notices");
    const record: NoticeRecord = { id: crypto.randomUUID(), trustId: resolveTrustId(context, input.trustId || null).trustId, documentId: input.documentId || null, contactId: input.contactId || null, noticeCode: input.noticeCode || sequence("NOT", (db.notices || []).length), noticeType: input.noticeType || "administrative-notice", serviceMethod: input.serviceMethod || "mail", status: input.status || "issued", issuedAt: input.issuedAt || nowIso(), servedAt: null, dueDate: input.dueDate || null, trackingNumber: input.trackingNumber || null, recipientName: input.recipientName || "Unknown Recipient", recipientAddress: input.recipientAddress || "", notes: input.notes || "", immutable: false, deletedAt: null } as any;
    db.notices = [record, ...(db.notices || [])]; db.addAudit("NOTICE_CREATED", "notice", record.id, null, record, undefined, getActor(context)); await db.persist("notice-created"); return record;
  }
  async serveNotice(context: RequestContext, id: string, trackingNumber?: string | null) {
    assertAuthorized(context, "notices.serve", "Serving notices"); const index = (db.notices || []).findIndex((item) => item.id === id && !item.deletedAt); if (index < 0) throw new Error("Notice not found.");
    const before = structuredClone(db.notices[index]); assertRecordTrustAccess(context, before, "Notice"); const updated: NoticeRecord = { ...before, status: "served", servedAt: nowIso(), trackingNumber: trackingNumber || before.trackingNumber || null } as any; db.notices[index] = updated; db.addAudit("NOTICE_SERVED", "notice", id, before, updated, undefined, getActor(context)); await db.persist("notice-served"); return updated;
  }
}

export const noticeRepository = new NoticeRepository();
