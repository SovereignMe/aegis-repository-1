import { requireAuthorized } from "../../services/authorization.service.js";
import { evidenceModuleServices } from "./interfaces.js";

export async function registerEvidenceRoutes(app: any) {
  const { exports } = evidenceModuleServices;
  app.get("/export/repository", { preHandler: requireAuthorized("exports.repository") }, async () => ({
    exportedAt: new Date().toISOString(),
    documents: exports.documents,
    tasks: exports.tasks,
    contacts: exports.contacts,
    timers: exports.timers,
    auditHeadHash: exports.audit[0]?.hash || null,
  }));
}
