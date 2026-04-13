import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { db } from "../store/governance-store.js";
import { recordBackupRestoreDrill } from "./observability.service.js";

function sha256Text(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function runBackupRestoreDrill() {
  await fs.mkdir(env.dataDir, { recursive: true });
  const snapshot = db.exportState();
  const serialized = JSON.stringify(snapshot, null, 2);
  const snapshotHash = sha256Text(serialized);
  const drillDir = path.join(env.dataDir, "backup-drills");
  await fs.mkdir(drillDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotPath = path.join(drillDir, `restore-drill-${stamp}.json`);
  await fs.writeFile(snapshotPath, serialized, "utf8");
  const restored = JSON.parse(await fs.readFile(snapshotPath, "utf8"));
  const snapshotPackets = Array.isArray(snapshot.packets) ? snapshot.packets : [];
  const checks = {
    documents: Array.isArray(restored.documents) && restored.documents.length === snapshot.documents.length,
    contacts: Array.isArray(restored.contacts) && restored.contacts.length === snapshot.contacts.length,
    tasks: Array.isArray(restored.tasks) && restored.tasks.length === snapshot.tasks.length,
    packets: Array.isArray(restored.packets) && restored.packets.length === snapshotPackets.length,
    audit: Array.isArray(restored.audit) && restored.audit.length === snapshot.audit.length,
  };
  const ok = Object.values(checks).every(Boolean);
  const drill = recordBackupRestoreDrill({ snapshotPath, snapshotHash, checks, ok });
  return {
    ...drill,
    snapshotPath,
    snapshotHash,
    checks,
    sourceCounts: {
      documents: snapshot.documents.length,
      contacts: snapshot.contacts.length,
      tasks: snapshot.tasks.length,
      packets: snapshotPackets.length,
      audit: snapshot.audit.length,
    },
  };
}
