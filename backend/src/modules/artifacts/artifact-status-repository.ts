import crypto from "node:crypto";
import type { ArtifactStatusRecord } from "../../models/domain.js";
import { db } from "../../store/governance-store.js";

function nowIso() { return new Date().toISOString(); }

export class ArtifactStatusRepository {
  listByTrust(trustId: string): ArtifactStatusRecord[] {
    return (db.artifactStatuses || []).filter((item: ArtifactStatusRecord) => item.trustId === trustId).sort((a: ArtifactStatusRecord, b: ArtifactStatusRecord) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  findByArtifactId(artifactId: string): ArtifactStatusRecord | null {
    return (db.artifactStatuses || []).find((item: ArtifactStatusRecord) => item.artifactId === artifactId) || null;
  }

  findByPacketId(packetId: string): ArtifactStatusRecord | null {
    return (db.artifactStatuses || []).find((item: ArtifactStatusRecord) => item.packetId === packetId) || null;
  }

  upsert(input: Omit<ArtifactStatusRecord, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string; updatedAt?: string }): ArtifactStatusRecord {
    const current = this.findByArtifactId(input.artifactId);
    const now = nowIso();
    const record: ArtifactStatusRecord = {
      ...(current || {} as ArtifactStatusRecord),
      ...input,
      id: current?.id || input.id || crypto.randomUUID(),
      createdAt: current?.createdAt || input.createdAt || now,
      updatedAt: input.updatedAt || now,
    };
    const items = (db.artifactStatuses || []).filter((item: ArtifactStatusRecord) => item.id !== record.id);
    db.artifactStatuses = [record, ...items];
    return record;
  }
}

export const artifactStatusRepository = new ArtifactStatusRepository();
