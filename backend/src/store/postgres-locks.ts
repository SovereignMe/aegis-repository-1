import type { PoolClient } from "pg";
import type { DistributionRecord, PacketRecord } from "../models/domain.js";

function normalizeUuid(value: string) {
  return value;
}

export async function lockDistributionRow(client: PoolClient, id: string) {
  const result = await client.query<{
    id: string;
    trustId: string;
    beneficiaryId: string;
    documentId: string | null;
    requestCode: string;
    category: string;
    amount: string | number;
    currency: string;
    status: DistributionRecord["status"];
    requestedAt: string;
    requestedBy: string | null;
    requestedByRole: DistributionRecord["requestedByRole"];
    approvedAt: string | null;
    approvedBy: string | null;
    paidAt: string | null;
    notes: string | null;
    reasonCode: string | null;
    immutable: boolean;
    deletedAt: string | null;
    requiredApprovals: number | null;
    approvalCount: number | null;
    versionNo: number | null;
  }>(
    `SELECT
      id,
      trust_id AS "trustId",
      beneficiary_id AS "beneficiaryId",
      document_id AS "documentId",
      request_code AS "requestCode",
      category,
      amount,
      currency,
      status,
      requested_at AS "requestedAt",
      requested_by AS "requestedBy",
      requested_by_role AS "requestedByRole",
      approved_at AS "approvedAt",
      approved_by AS "approvedBy",
      paid_at AS "paidAt",
      notes,
      reason_code AS "reasonCode",
      immutable,
      deleted_at AS "deletedAt",
      required_approvals AS "requiredApprovals",
      approval_count AS "approvalCount",
      version_no AS "versionNo"
    FROM distributions
    WHERE id = $1
    FOR UPDATE`,
    [normalizeUuid(id)],
  );

  const row = result.rows[0];
  if (!row) return null;
  return { ...row, amount: Number(row.amount) } as DistributionRecord;
}

export async function lockPacketRow(client: PoolClient, id: string) {
  const result = await client.query<{
    id: string;
    trustId: string;
    packetCode: string;
    packetType: PacketRecord["packetType"];
    title: string;
    status: PacketRecord["status"];
    documentIds: string[];
    noticeIds: string[];
    ledgerEntryIds: string[];
    exhibitIds: string[];
    generatedAt: string;
    generatedBy: string;
    generatedByRole: PacketRecord["generatedByRole"];
    reasonCode: string | null;
    notes: string | null;
    requiredApprovals: number | null;
    approvalCount: number | null;
    manifestPath: string | null;
    manifestHash: string | null;
    manifestKeyId: string | null;
    anchoredAt: string | null;
    immutable: boolean;
    deletedAt: string | null;
    versionNo: number | null;
  }>(
    `SELECT
      id,
      trust_id AS "trustId",
      packet_code AS "packetCode",
      packet_type AS "packetType",
      title,
      status,
      document_ids_json AS "documentIds",
      notice_ids_json AS "noticeIds",
      ledger_entry_ids_json AS "ledgerEntryIds",
      exhibit_ids_json AS "exhibitIds",
      generated_at AS "generatedAt",
      generated_by AS "generatedBy",
      generated_by_role AS "generatedByRole",
      reason_code AS "reasonCode",
      notes,
      required_approvals AS "requiredApprovals",
      approval_count AS "approvalCount",
      manifest_path AS "manifestPath",
      manifest_hash AS "manifestHash",
      manifest_key_id AS "manifestKeyId",
      anchored_at AS "anchoredAt",
      immutable,
      deleted_at AS "deletedAt",
      version_no AS "versionNo"
    FROM packets
    WHERE id = $1
    FOR UPDATE`,
    [normalizeUuid(id)],
  );

  return (result.rows[0] || null) as PacketRecord | null;
}
