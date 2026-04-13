import { db } from "../../store/governance-store.js";

export class AuditRepository {
  getStorageMeta = db.getStorageMeta.bind(db);
  verifyAudit = db.verifyAudit.bind(db);
  getAuditForTrust = db.getAuditForTrust.bind(db);
}

export const auditRepository = new AuditRepository();
