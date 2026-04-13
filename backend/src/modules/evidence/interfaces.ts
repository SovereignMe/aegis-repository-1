import { EvidenceModuleService } from "./services.js";
import { evidenceRepository } from "./repositories.js";

const evidenceModuleService = new EvidenceModuleService(evidenceRepository);

export interface EvidenceExportPort {
  readonly documents: EvidenceModuleService["documents"];
  readonly tasks: EvidenceModuleService["tasks"];
  readonly contacts: EvidenceModuleService["contacts"];
  readonly timers: EvidenceModuleService["timers"];
  readonly audit: EvidenceModuleService["audit"];
}

export const evidenceModuleServices: { exports: EvidenceExportPort } = {
  exports: evidenceModuleService,
};
