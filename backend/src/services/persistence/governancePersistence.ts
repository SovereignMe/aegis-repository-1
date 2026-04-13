import type { Pool, PoolClient } from "pg";
import type {
  AccountingEntryRecord,
  ApprovalRecord,
  ArtifactStatusRecord,
  AuthorityChainRecord,
  BeneficiaryRecord,
  DistributionRecord,
  GovernanceState,
  IntegrationRecord,
  NoticeRecord,
  PacketRecord,
  TenantRecord,
  TimerRecord,
  TrustLedgerEntryRecord,
  TrustRecord,
} from "../../models/domain.js";
import type { DocumentRecord, ExhibitIndexRecord } from "../../models/domain.js";

export async function loadGovernanceState(
  pool: Pool,
  isIntegrationAvailable: (provider: string) => boolean,
  _documents: DocumentRecord[],
  _exhibits: ExhibitIndexRecord[],
  _seedTrustLedgerEntries: (documents: DocumentRecord[], exhibits: ExhibitIndexRecord[]) => GovernanceState["trustLedgerEntries"],
  _seedAuthorityChain: (documents: DocumentRecord[]) => GovernanceState["authorityChain"],
  _seedBeneficiaries: () => GovernanceState["beneficiaries"],
): Promise<Partial<GovernanceState>> {
  const [
    tenantRows,
    trustRows,
    integrationRows,
    timerRows,
    trustLedgerEntryRows,
    accountingEntryRows,
    authorityChainRows,
    beneficiaryRows,
    distributionRows,
    noticeRows,
    packetRows,
    approvalRows,
    artifactStatusRows,
  ] = await Promise.all([
    pool.query(`SELECT id, code, name, status, created_at AS "createdAt", updated_at AS "updatedAt" FROM tenants ORDER BY created_at ASC, code ASC`),
    pool.query(`SELECT id, tenant_id AS "tenantId", trust_code AS "trustCode", trust_name AS "trustName", jurisdiction, status, created_at AS "createdAt", updated_at AS "updatedAt" FROM trusts ORDER BY created_at ASC, trust_code ASC`),
    pool.query(`SELECT id, tenant_id AS "tenantId", provider, status, account_email AS "accountEmail", connected_at AS "connectedAt", disconnected_at AS "disconnectedAt", last_sync_at AS "lastSyncAt", sync_mode AS "syncMode", capabilities_json AS "capabilities" FROM integrations ORDER BY provider`),
    pool.query(`SELECT id, trust_id AS "trustId", related_task_id AS "relatedTaskId", related_document_id AS "relatedDocumentId", timer_type AS "timerType", label, started_at AS "startedAt", stopped_at AS "stoppedAt", duration_seconds AS "durationSeconds", notes, created_by AS "createdBy", immutable, deleted_at AS "deletedAt" FROM timers ORDER BY started_at DESC`),
    pool.query(`SELECT id, trust_id AS "trustId", ledger_id AS "ledgerId", entry_code AS "entryCode", entry_type AS "entryType", document_id AS "documentId", exhibit_id AS "exhibitId", title, description, effective_date::text AS "effectiveDate", posted_at AS "postedAt", immutable, deleted_at AS "deletedAt", metadata_json AS metadata FROM trust_ledger_entries ORDER BY posted_at DESC, entry_code DESC`),
    pool.query(`SELECT id, trust_id AS "trustId", ledger_id AS "ledgerId", entry_code AS "entryCode", document_id AS "documentId", distribution_id AS "distributionId", account_code AS "accountCode", direction, amount, currency, memo, posted_at AS "postedAt", immutable, deleted_at AS "deletedAt" FROM accounting_entries ORDER BY posted_at DESC, entry_code DESC`),
    pool.query(`SELECT id, trust_id AS "trustId", document_id AS "documentId", authority_type AS "authorityType", parent_document_id AS "parentDocumentId", status, validated_at AS "validatedAt", notes FROM authority_chain ORDER BY validated_at DESC, id DESC`),
    pool.query(`SELECT id, trust_id AS "trustId", beneficiary_code AS "beneficiaryCode", full_name AS "fullName", beneficiary_type AS "beneficiaryType", status, allocation_percent AS "allocationPercent", notes, immutable, deleted_at AS "deletedAt", created_at AS "createdAt", updated_at AS "updatedAt" FROM beneficiaries ORDER BY created_at ASC, beneficiary_code ASC`),
    pool.query(`SELECT id, trust_id AS "trustId", beneficiary_id AS "beneficiaryId", document_id AS "documentId", request_code AS "requestCode", category, amount, currency, status, requested_at AS "requestedAt", requested_by AS "requestedBy", requested_by_role AS "requestedByRole", approved_at AS "approvedAt", approved_by AS "approvedBy", paid_at AS "paidAt", notes, reason_code AS "reasonCode", immutable, deleted_at AS "deletedAt", required_approvals AS "requiredApprovals", approval_count AS "approvalCount", version_no AS "versionNo" FROM distributions ORDER BY requested_at DESC, request_code DESC`),
    pool.query(`SELECT id, trust_id AS "trustId", document_id AS "documentId", contact_id AS "contactId", notice_code AS "noticeCode", notice_type AS "noticeType", service_method AS "serviceMethod", status, issued_at AS "issuedAt", served_at AS "servedAt", due_date::text AS "dueDate", tracking_number AS "trackingNumber", recipient_name AS "recipientName", recipient_address AS "recipientAddress", notes, immutable, deleted_at AS "deletedAt" FROM notices ORDER BY issued_at DESC, notice_code DESC`),
    pool.query(`SELECT id, trust_id AS "trustId", packet_code AS "packetCode", packet_type AS "packetType", title, status, document_ids_json AS "documentIds", notice_ids_json AS "noticeIds", ledger_entry_ids_json AS "ledgerEntryIds", exhibit_ids_json AS "exhibitIds", generated_at AS "generatedAt", generated_by AS "generatedBy", generated_by_role AS "generatedByRole", reason_code AS "reasonCode", notes, required_approvals AS "requiredApprovals", approval_count AS "approvalCount", manifest_path AS "manifestPath", bundle_dir AS "bundleDir", bundle_path AS "bundlePath", manifest_signature AS "manifestSignature", bundle_signature AS "bundleSignature", manifest_hash AS "manifestHash", bundle_hash AS "bundleHash", timestamp_path AS "timestampPath", timestamp_token AS "timestampToken", timestamp_authority AS "timestampAuthority", manifest_key_id AS "manifestKeyId", verification_summary_path AS "verificationSummaryPath", export_watermark AS "exportWatermark", anchored_at AS "anchoredAt", hash_anchor_receipt AS "hashAnchorReceipt", immutable, deleted_at AS "deletedAt", version_no AS "versionNo" FROM packets ORDER BY generated_at DESC, packet_code DESC`),
    pool.query(`SELECT id, trust_id AS "trustId", target_type AS "targetType", target_id AS "targetId", action_type AS "actionType", stage, actor_email AS "actorEmail", actor_role AS "actorRole", decision, notes, reason_code AS "reasonCode", created_at AS "createdAt", immutable FROM approvals ORDER BY created_at DESC, id DESC`),
    pool.query(`SELECT id, artifact_type AS "artifactType", artifact_id AS "artifactId", trust_id AS "trustId", packet_id AS "packetId", bundle_path AS "bundlePath", bundle_hash AS "bundleHash", manifest_hash AS "manifestHash", public_proof_provider AS "publicProofProvider", status, verification_status AS "verificationStatus", anchor_ref AS "anchorRef", anchor_proof AS "anchorProof", anchor_receipt_path AS "anchorReceiptPath", verification_receipt_path AS "verificationReceiptPath", failure_reason AS "failureReason", last_checked_at AS "lastCheckedAt", created_at AS "createdAt", updated_at AS "updatedAt" FROM artifact_statuses ORDER BY updated_at DESC, created_at DESC`),
  ]);

  return {
    tenants: tenantRows.rows as TenantRecord[],
    trusts: trustRows.rows as TrustRecord[],
    integrations: (integrationRows.rows as IntegrationRecord[]).filter((item) => isIntegrationAvailable(item.provider) && item.status !== "placeholder"),
    timers: timerRows.rows as TimerRecord[],
    trustLedgerEntries: trustLedgerEntryRows.rows as TrustLedgerEntryRecord[],
    accountingEntries: accountingEntryRows.rows.map((row) => ({ ...row, amount: Number((row as any).amount) })) as AccountingEntryRecord[],
    authorityChain: authorityChainRows.rows as AuthorityChainRecord[],
    beneficiaries: beneficiaryRows.rows.map((row) => ({ ...row, allocationPercent: Number((row as any).allocationPercent) })) as BeneficiaryRecord[],
    distributions: distributionRows.rows.map((row) => ({ ...row, amount: Number((row as any).amount) })) as DistributionRecord[],
    notices: noticeRows.rows as NoticeRecord[],
    packets: packetRows.rows as PacketRecord[],
    approvals: approvalRows.rows as ApprovalRecord[],
    artifactStatuses: artifactStatusRows.rows as ArtifactStatusRecord[],
  };
}

export async function persistGovernanceState(
  client: PoolClient,
  state: Partial<GovernanceState>,
  defaultTenants: TenantRecord[],
  defaultTrusts: TrustRecord[],
  localTenantId: string,
) {
  const tenants = (state.tenants?.length ? state.tenants : defaultTenants).map((tenant) => ({ ...tenant }));
  const trusts = (state.trusts?.length ? state.trusts : defaultTrusts).map((trust) => ({ ...trust }));
  const trustTenantMap = new Map(trusts.map((trust) => [trust.id, trust.tenantId]));
  const resolveTenantIdForTrust = (trustId?: string | null) => (trustId ? trustTenantMap.get(String(trustId)) : undefined) || tenants[0]?.id || localTenantId;

  const trustIds = trusts.map((item) => item.id);
  if (trustIds.length) await client.query(`DELETE FROM trusts WHERE NOT (id = ANY($1::text[]))`, [trustIds]);
  else await client.query(`DELETE FROM trusts`);
  const tenantIds = tenants.map((item) => item.id);
  if (tenantIds.length) await client.query(`DELETE FROM tenants WHERE NOT (id = ANY($1::text[]))`, [tenantIds]);
  else await client.query(`DELETE FROM tenants`);

  for (const tenant of tenants) {
    await client.query(`INSERT INTO tenants (id, code, name, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`, [tenant.id, tenant.code, tenant.name, tenant.status, tenant.createdAt, tenant.updatedAt]);
  }
  for (const trust of trusts) {
    await client.query(`INSERT INTO trusts (id, tenant_id, trust_code, trust_name, jurisdiction, status, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, trust_code = EXCLUDED.trust_code, trust_name = EXCLUDED.trust_name, jurisdiction = EXCLUDED.jurisdiction, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`, [trust.id, trust.tenantId, trust.trustCode, trust.trustName, trust.jurisdiction, trust.status, trust.createdAt, trust.updatedAt]);
  }

  await client.query(`DELETE FROM integrations`);
  for (const integration of state.integrations || []) {
    await client.query(`INSERT INTO integrations (id, tenant_id, provider, status, account_email, connected_at, disconnected_at, last_sync_at, sync_mode, capabilities_json) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`, [integration.id, integration.tenantId || tenants[0]?.id || localTenantId, integration.provider, integration.status, integration.accountEmail || null, integration.connectedAt || null, integration.disconnectedAt || null, integration.lastSyncAt || null, integration.syncMode, JSON.stringify(integration.capabilities || [])]);
  }

  const timerIds = (state.timers || []).map((item) => item.id);
  if (timerIds.length) await client.query(`DELETE FROM timers WHERE NOT (id = ANY($1::uuid[]))`, [timerIds]);
  else await client.query(`DELETE FROM timers`);
  for (const timer of state.timers || []) {
    await client.query(`INSERT INTO timers (id, tenant_id, trust_id, related_task_id, related_document_id, timer_type, label, started_at, stopped_at, duration_seconds, notes, created_by, immutable, deleted_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, trust_id = EXCLUDED.trust_id, related_task_id = EXCLUDED.related_task_id, related_document_id = EXCLUDED.related_document_id, timer_type = EXCLUDED.timer_type, label = EXCLUDED.label, started_at = EXCLUDED.started_at, stopped_at = EXCLUDED.stopped_at, duration_seconds = EXCLUDED.duration_seconds, notes = EXCLUDED.notes, created_by = EXCLUDED.created_by, immutable = EXCLUDED.immutable, deleted_at = EXCLUDED.deleted_at`, [timer.id, resolveTenantIdForTrust(timer.trustId || null), timer.trustId || null, timer.relatedTaskId || null, timer.relatedDocumentId || null, timer.timerType, timer.label, timer.startedAt, timer.stoppedAt || null, timer.durationSeconds, timer.notes || null, timer.createdBy, Boolean(timer.immutable), timer.deletedAt || null]);
  }

  await client.query(`DELETE FROM trust_ledger_entries`);
  for (const entry of state.trustLedgerEntries || []) {
    await client.query(`INSERT INTO trust_ledger_entries (id, tenant_id, trust_id, ledger_id, entry_code, entry_type, document_id, exhibit_id, title, description, effective_date, posted_at, immutable, deleted_at, metadata_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12,$13,$14,$15::jsonb)`, [entry.id, resolveTenantIdForTrust(entry.trustId), entry.trustId, entry.ledgerId, entry.entryCode, entry.entryType, entry.documentId || null, entry.exhibitId || null, entry.title, entry.description || null, entry.effectiveDate, entry.postedAt, Boolean(entry.immutable), entry.deletedAt || null, JSON.stringify(entry.metadata || {})]);
  }

  await client.query(`DELETE FROM accounting_entries`);
  for (const entry of state.accountingEntries || []) {
    await client.query(`INSERT INTO accounting_entries (id, tenant_id, trust_id, ledger_id, entry_code, document_id, distribution_id, account_code, direction, amount, currency, memo, posted_at, immutable, deleted_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, [entry.id, resolveTenantIdForTrust(entry.trustId), entry.trustId, entry.ledgerId, entry.entryCode, entry.documentId || null, entry.distributionId || null, entry.accountCode, entry.direction, entry.amount, entry.currency, entry.memo || null, entry.postedAt, Boolean(entry.immutable), entry.deletedAt || null]);
  }

  await client.query(`DELETE FROM authority_chain`);
  for (const record of state.authorityChain || []) {
    await client.query(`INSERT INTO authority_chain (id, tenant_id, trust_id, document_id, authority_type, parent_document_id, status, validated_at, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [record.id, resolveTenantIdForTrust(record.trustId), record.trustId, record.documentId, record.authorityType, record.parentDocumentId || null, record.status, record.validatedAt, record.notes || null]);
  }

  await client.query(`DELETE FROM beneficiaries`);
  for (const record of state.beneficiaries || []) {
    await client.query(`INSERT INTO beneficiaries (id, tenant_id, trust_id, beneficiary_code, full_name, beneficiary_type, status, allocation_percent, notes, immutable, deleted_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [record.id, resolveTenantIdForTrust(record.trustId), record.trustId, record.beneficiaryCode, record.fullName, record.beneficiaryType, record.status, record.allocationPercent, record.notes || null, Boolean(record.immutable), record.deletedAt || null, record.createdAt, record.updatedAt]);
  }

  await client.query(`DELETE FROM distributions`);
  for (const record of state.distributions || []) {
    await client.query(`INSERT INTO distributions (id, tenant_id, trust_id, beneficiary_id, document_id, request_code, category, amount, currency, status, requested_at, requested_by, requested_by_role, approved_at, approved_by, paid_at, notes, reason_code, immutable, deleted_at, required_approvals, approval_count, version_no) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`, [record.id, resolveTenantIdForTrust(record.trustId), record.trustId, record.beneficiaryId, record.documentId || null, record.requestCode, record.category, record.amount, record.currency, record.status, record.requestedAt, record.requestedBy || null, record.requestedByRole || null, record.approvedAt || null, record.approvedBy || null, record.paidAt || null, record.notes || null, record.reasonCode || null, Boolean(record.immutable), record.deletedAt || null, Number(record.requiredApprovals || 0), Number(record.approvalCount || 0), Number(record.versionNo || 1)]);
  }

  await client.query(`DELETE FROM notices`);
  for (const record of state.notices || []) {
    await client.query(`INSERT INTO notices (id, tenant_id, trust_id, document_id, contact_id, notice_code, notice_type, service_method, status, issued_at, served_at, due_date, tracking_number, recipient_name, recipient_address, notes, immutable, deleted_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::date,$13,$14,$15,$16,$17,$18)`, [record.id, resolveTenantIdForTrust(record.trustId), record.trustId, record.documentId || null, record.contactId || null, record.noticeCode, record.noticeType, record.serviceMethod, record.status, record.issuedAt, record.servedAt || null, record.dueDate || null, record.trackingNumber || null, record.recipientName, record.recipientAddress || null, record.notes || null, Boolean(record.immutable), record.deletedAt || null]);
  }

  await client.query(`DELETE FROM packets`);
  for (const record of state.packets || []) {
    await client.query(`INSERT INTO packets (id, tenant_id, trust_id, packet_code, packet_type, title, status, document_ids_json, notice_ids_json, ledger_entry_ids_json, exhibit_ids_json, generated_at, generated_by, generated_by_role, reason_code, notes, required_approvals, approval_count, manifest_path, bundle_dir, bundle_path, manifest_signature, bundle_signature, manifest_hash, bundle_hash, timestamp_path, timestamp_token, timestamp_authority, manifest_key_id, verification_summary_path, export_watermark, anchored_at, hash_anchor_receipt, immutable, deleted_at, version_no) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36)`, [record.id, resolveTenantIdForTrust(record.trustId), record.trustId, record.packetCode, record.packetType, record.title, record.status, JSON.stringify(record.documentIds || []), JSON.stringify(record.noticeIds || []), JSON.stringify(record.ledgerEntryIds || []), JSON.stringify(record.exhibitIds || []), record.generatedAt, record.generatedBy, record.generatedByRole || null, record.reasonCode || null, record.notes || null, Number(record.requiredApprovals || 0), Number(record.approvalCount || 0), record.manifestPath || null, record.bundleDir || null, record.bundlePath || null, record.manifestSignature || null, record.bundleSignature || null, record.manifestHash || null, record.bundleHash || null, record.timestampPath || null, record.timestampToken || null, record.timestampAuthority || null, record.manifestKeyId || null, record.verificationSummaryPath || null, record.exportWatermark || null, record.anchoredAt || null, record.hashAnchorReceipt || null, Boolean(record.immutable), record.deletedAt || null, Number(record.versionNo || 1)]);
  }

  await client.query(`DELETE FROM approvals`);
  for (const record of state.approvals || []) {
    await client.query(`INSERT INTO approvals (id, trust_id, target_type, target_id, action_type, stage, actor_email, actor_role, decision, notes, reason_code, created_at, immutable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [record.id, record.trustId, record.targetType, record.targetId, record.actionType, record.stage, record.actorEmail, record.actorRole, record.decision, record.notes, record.reasonCode, record.createdAt, Boolean(record.immutable)]);
  }

  await client.query(`DELETE FROM artifact_statuses`);
  for (const record of state.artifactStatuses || []) {
    await client.query(`INSERT INTO artifact_statuses (id, tenant_id, trust_id, artifact_type, artifact_id, packet_id, bundle_path, bundle_hash, manifest_hash, public_proof_provider, status, verification_status, anchor_ref, anchor_proof, anchor_receipt_path, verification_receipt_path, failure_reason, last_checked_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`, [record.id, resolveTenantIdForTrust(record.trustId), record.trustId, record.artifactType, record.artifactId, record.packetId || null, record.bundlePath || null, record.bundleHash || null, record.manifestHash || null, record.publicProofProvider, record.status, record.verificationStatus, record.anchorRef || null, record.anchorProof || null, record.anchorReceiptPath || null, record.verificationReceiptPath || null, record.failureReason || null, record.lastCheckedAt || null, record.createdAt, record.updatedAt]);
  }

  return { tenants, trusts, resolveTenantIdForTrust };
}
