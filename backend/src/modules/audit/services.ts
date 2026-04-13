import type { AuditRepository } from "./repositories.js";

export class AuditModuleService {
  constructor(private readonly repository: AuditRepository) {}

  getStorageMeta(...args: Parameters<AuditRepository["getStorageMeta"]>) { return this.repository.getStorageMeta(...args); }
  verifyAudit(...args: Parameters<AuditRepository["verifyAudit"]>) { return this.repository.verifyAudit(...args); }
  getAuditForTrust(...args: Parameters<AuditRepository["getAuditForTrust"]>) { return this.repository.getAuditForTrust(...args); }
}
