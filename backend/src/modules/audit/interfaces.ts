import { AuditModuleService } from "./services.js";
import { auditRepository } from "./repositories.js";

const auditModuleService = new AuditModuleService(auditRepository);

export interface AuditRepositoryPort {
  getStorageMeta: AuditModuleService["getStorageMeta"];
  verifyAudit: AuditModuleService["verifyAudit"];
  getAuditForTrust: AuditModuleService["getAuditForTrust"];
}

export const auditModuleServices: { audit: AuditRepositoryPort } = {
  audit: auditModuleService,
};
