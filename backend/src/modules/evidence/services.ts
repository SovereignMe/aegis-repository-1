import type { EvidenceRepository } from "./repositories.js";

export class EvidenceModuleService {
  constructor(private readonly repository: EvidenceRepository) {}

  get documents() { return this.repository.documents; }
  get tasks() { return this.repository.tasks; }
  get contacts() { return this.repository.contacts; }
  get timers() { return this.repository.timers; }
  get audit() { return this.repository.audit; }
}
