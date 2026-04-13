import fs from 'node:fs/promises';
import path from 'node:path';
import type { PacketRecord } from '../../models/domain.js';
import { db } from '../../store/governance-store.js';
import { env } from '../../config/env.js';

export class PacketArtifactRepository {
  listPackets(): PacketRecord[] { return db.packets || []; }
  listPacketsByTrust(trustId: string): PacketRecord[] { return (db.packets || []).filter((item) => item.trustId === trustId && !item.deletedAt); }
  findPacketById(id: string, trustId?: string): PacketRecord | null { return (db.packets || []).find((item) => item.id === id && (!trustId || item.trustId === trustId)) || null; }
  findActivePacketById(id: string, trustId?: string): PacketRecord | null { return (db.packets || []).find((item) => item.id === id && !item.deletedAt && (!trustId || item.trustId === trustId)) || null; }
  findPacketIndex(id: string, trustId?: string): number { return (db.packets || []).findIndex((item) => item.id === id && !item.deletedAt && (!trustId || item.trustId === trustId)); }
  savePacket(packet: PacketRecord, options: { prepend?: boolean } = {}) {
    const packets = db.packets || [];
    const index = packets.findIndex((item) => item.id === packet.id);
    if (index >= 0) packets[index] = packet;
    else if (options.prepend !== false) packets.unshift(packet);
    else packets.push(packet);
    db.packets = packets;
    return packet;
  }
  updatePacketAt(index: number, packet: PacketRecord) {
    const packets = db.packets || [];
    packets[index] = packet;
    db.packets = packets;
    return packet;
  }
  nextPacketSequence(packetType: PacketRecord['packetType']): number {
    const prefix = packetType === 'administrative-record' ? 'ARP' : 'EVP';
    return (db.packets || []).filter((item) => item.packetCode?.startsWith(prefix)).length + 1;
  }
  async ensureBundleDirectories(bundleSlug: string) {
    const bundleDir = path.join(env.evidenceBundlesDir, bundleSlug);
    const recordsDir = path.join(bundleDir, 'records');
    const filesDir = path.join(bundleDir, 'files');
    await fs.mkdir(recordsDir, { recursive: true });
    await fs.mkdir(filesDir, { recursive: true });
    return { bundleDir, recordsDir, filesDir };
  }
  async writeJson(filePath: string, payload: unknown) {
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
    return filePath;
  }
  async writeText(filePath: string, payload: string) {
    await fs.writeFile(filePath, payload, 'utf8');
    return filePath;
  }
  async readJsonIfPresent(filePath?: string | null) {
    if (!filePath) return null;
    return JSON.parse(await fs.readFile(filePath, 'utf8').catch(() => 'null'));
  }
}

export const packetArtifactRepository = new PacketArtifactRepository();
