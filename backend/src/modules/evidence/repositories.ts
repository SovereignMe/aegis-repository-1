import { db } from "../../store/governance-store.js";

export class EvidenceRepository {
  get documents() { return db.documents; }
  get tasks() { return db.tasks; }
  get contacts() { return db.contacts; }
  get timers() { return db.timers; }
  get audit() { return db.audit; }
}

export const evidenceRepository = new EvidenceRepository();
