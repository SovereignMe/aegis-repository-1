import crypto from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { ContactRecord, DocumentRecord, ExhibitIndexRecord, TaskRecord, TrustLedgerRecord } from "../../models/domain.js";

export async function loadDocumentRepositoryState(pool: Pool): Promise<{
  documents: DocumentRecord[];
  contacts: ContactRecord[];
  tasks: TaskRecord[];
  trustLedgers: TrustLedgerRecord[];
  exhibitIndex: ExhibitIndexRecord[];
}> {
  const documentRows = await pool.query(`SELECT id, trust_id AS "trustId", system_id AS "systemId", display_id AS "displayId", title, exhibit_code AS "exhibitCode", doc_type AS "docType", category, status, jurisdiction, governing_level AS "governingLevel", source_type AS "sourceType", summary, notes, effective_date::text AS "effectiveDate", created_at AS "createdAt", updated_at AS "updatedAt", immutable, deleted_at AS "deletedAt", deleted_by AS "deletedBy", ledger_ids_json AS "ledgerIds", tags_json AS tags, file_name AS "fileName", original_file_name AS "originalFileName", mime_type AS "mimeType", file_size AS "fileSize", file_hash AS "fileHash", storage_path AS "storagePath" FROM documents ORDER BY updated_at DESC, title ASC`);
  const contactRows = await pool.query(`SELECT id, trust_id AS "trustId", contact_type AS "contactType", full_name AS "fullName", organization, email, phone, fax_number AS "faxNumber", status, address_line_1 AS "addressLine1", address_line_2 AS "addressLine2", city, state, postal_code AS "postalCode", country, notes, created_at AS "createdAt", updated_at AS "updatedAt", immutable, deleted_at AS "deletedAt", deleted_by AS "deletedBy" FROM contacts ORDER BY updated_at DESC, full_name ASC`);
  const taskRows = await pool.query(`SELECT id, trust_id AS "trustId", document_id AS "documentId", contact_id AS "contactId", title, task_type AS "taskType", status, priority, trigger_date::text AS "triggerDate", due_date::text AS "dueDate", completed_at AS "completedAt", assigned_to AS "assignedTo", rule_code AS "ruleCode", custom_day_value AS "customDayValue", notes, reminders_json AS reminders, created_at AS "createdAt", updated_at AS "updatedAt", immutable, deleted_at AS "deletedAt", deleted_by AS "deletedBy" FROM tasks ORDER BY updated_at DESC, title ASC`);
  const ledgerRows = await pool.query(`SELECT id, trust_id AS "trustId", ledger_code AS "ledgerCode", ledger_type AS "ledgerType", name, description, immutable, deleted_at AS "deletedAt", created_at AS "createdAt", updated_at AS "updatedAt" FROM trust_ledgers ORDER BY ledger_code ASC`);
  const exhibitRows = await pool.query(`SELECT id, trust_id AS "trustId", document_id AS "documentId", exhibit_code AS "exhibitCode", sequence_number AS "sequenceNumber", label, immutable, deleted_at AS "deletedAt", created_at AS "createdAt", updated_at AS "updatedAt" FROM exhibit_index ORDER BY sequence_number ASC`);
  return {
    documents: documentRows.rows,
    contacts: contactRows.rows,
    tasks: taskRows.rows,
    trustLedgers: ledgerRows.rows,
    exhibitIndex: exhibitRows.rows,
  };
}

export async function persistDocumentRepositoryState(
  client: PoolClient,
  state: { documents: DocumentRecord[]; contacts: ContactRecord[]; tasks: TaskRecord[]; trustLedgers?: TrustLedgerRecord[]; exhibitIndex?: ExhibitIndexRecord[] },
  resolveTenantIdForTrust: (trustId?: string | null) => string,
  seedExhibitIndex: (documents: DocumentRecord[]) => ExhibitIndexRecord[],
) {
  const ledgerIds = (state.trustLedgers || []).map((item) => item.id);
  if (ledgerIds.length) await client.query(`DELETE FROM trust_ledgers WHERE NOT (id = ANY($1::uuid[]))`, [ledgerIds]);
  else await client.query(`DELETE FROM trust_ledgers`);
  for (const ledger of state.trustLedgers || []) {
    await client.query(`INSERT INTO trust_ledgers (id, tenant_id, trust_id, ledger_code, ledger_type, name, description, immutable, deleted_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, trust_id = EXCLUDED.trust_id, ledger_code = EXCLUDED.ledger_code, ledger_type = EXCLUDED.ledger_type, name = EXCLUDED.name, description = EXCLUDED.description, immutable = EXCLUDED.immutable, deleted_at = EXCLUDED.deleted_at, updated_at = EXCLUDED.updated_at`, [ledger.id, resolveTenantIdForTrust(ledger.trustId), ledger.trustId, ledger.ledgerCode, ledger.ledgerType, ledger.name, ledger.description || null, Boolean(ledger.immutable), ledger.deletedAt || null, ledger.createdAt, ledger.updatedAt]);
  }

  const documentIds = state.documents.map((item) => item.id);
  if (documentIds.length) await client.query(`DELETE FROM document_versions WHERE NOT (document_id = ANY($1::uuid[]))`, [documentIds]);
  else await client.query(`DELETE FROM document_versions`);
  if (documentIds.length) await client.query(`DELETE FROM exhibit_index WHERE NOT (document_id = ANY($1::uuid[]))`, [documentIds]);
  else await client.query(`DELETE FROM exhibit_index`);
  if (documentIds.length) await client.query(`DELETE FROM documents WHERE NOT (id = ANY($1::uuid[]))`, [documentIds]);
  else await client.query(`DELETE FROM documents`);

  for (const document of state.documents) {
    await client.query(`INSERT INTO documents (id, tenant_id, trust_id, system_id, display_id, title, exhibit_code, doc_type, category, status, jurisdiction, governing_level, source_type, summary, notes, effective_date, created_at, updated_at, immutable, deleted_at, deleted_by, ledger_ids_json, tags_json, file_name, original_file_name, mime_type, file_size, file_hash, storage_path) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22::jsonb,$23::jsonb,$24,$25,$26,$27,$28,$29) ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, trust_id = EXCLUDED.trust_id, system_id = EXCLUDED.system_id, display_id = EXCLUDED.display_id, title = EXCLUDED.title, exhibit_code = EXCLUDED.exhibit_code, doc_type = EXCLUDED.doc_type, category = EXCLUDED.category, status = EXCLUDED.status, jurisdiction = EXCLUDED.jurisdiction, governing_level = EXCLUDED.governing_level, source_type = EXCLUDED.source_type, summary = EXCLUDED.summary, notes = EXCLUDED.notes, effective_date = EXCLUDED.effective_date, updated_at = EXCLUDED.updated_at, immutable = EXCLUDED.immutable, deleted_at = EXCLUDED.deleted_at, deleted_by = EXCLUDED.deleted_by, ledger_ids_json = EXCLUDED.ledger_ids_json, tags_json = EXCLUDED.tags_json, file_name = EXCLUDED.file_name, original_file_name = EXCLUDED.original_file_name, mime_type = EXCLUDED.mime_type, file_size = EXCLUDED.file_size, file_hash = EXCLUDED.file_hash, storage_path = EXCLUDED.storage_path`, [document.id, resolveTenantIdForTrust(document.trustId), document.trustId, document.systemId, document.displayId, document.title, document.exhibitCode, document.docType, document.category, document.status, document.jurisdiction, document.governingLevel, document.sourceType, document.summary, document.notes, document.effectiveDate, document.createdAt || document.updatedAt, document.updatedAt, Boolean(document.immutable), document.deletedAt || null, document.deletedBy || null, JSON.stringify(document.ledgerIds || []), JSON.stringify(document.tags || []), document.fileName || null, document.originalFileName || null, document.mimeType || null, document.fileSize || null, document.fileHash || null, document.storagePath || null]);
    await client.query(`INSERT INTO document_versions (id, document_id, version_number, storage_path, file_name, original_file_name, mime_type, file_size, file_hash, change_summary, is_current, immutable, created_at, created_by) VALUES ($1,$2,1,$3,$4,$5,$6,$7,$8,$9,TRUE,$10,$11,$12) ON CONFLICT (document_id, version_number) DO UPDATE SET storage_path = EXCLUDED.storage_path, file_name = EXCLUDED.file_name, original_file_name = EXCLUDED.original_file_name, mime_type = EXCLUDED.mime_type, file_size = EXCLUDED.file_size, file_hash = EXCLUDED.file_hash, change_summary = EXCLUDED.change_summary, is_current = TRUE, immutable = EXCLUDED.immutable`, [crypto.createHash("sha1").update(document.id).digest("hex").slice(0, 32).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5'), document.id, document.storagePath || null, document.fileName || null, document.originalFileName || null, document.mimeType || null, document.fileSize || null, document.fileHash || null, "Initial persisted version", Boolean(document.immutable), document.createdAt || document.updatedAt, "system"]);
  }

  const exhibits = (state.exhibitIndex?.length ? state.exhibitIndex : seedExhibitIndex(state.documents)).filter((item) => documentIds.includes(item.documentId));
  for (const exhibit of exhibits) {
    await client.query(`INSERT INTO exhibit_index (id, tenant_id, trust_id, document_id, exhibit_code, sequence_number, label, immutable, deleted_at, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, trust_id = EXCLUDED.trust_id, document_id = EXCLUDED.document_id, exhibit_code = EXCLUDED.exhibit_code, sequence_number = EXCLUDED.sequence_number, label = EXCLUDED.label, immutable = EXCLUDED.immutable, deleted_at = EXCLUDED.deleted_at, updated_at = EXCLUDED.updated_at`, [exhibit.id, resolveTenantIdForTrust(exhibit.trustId), exhibit.trustId, exhibit.documentId, exhibit.exhibitCode, exhibit.sequenceNumber, exhibit.label, Boolean(exhibit.immutable), exhibit.deletedAt || null, exhibit.createdAt, exhibit.updatedAt]);
  }

  const contactIds = state.contacts.map((item) => item.id);
  if (contactIds.length) await client.query(`DELETE FROM contacts WHERE NOT (id = ANY($1::uuid[]))`, [contactIds]);
  else await client.query(`DELETE FROM contacts`);
  for (const contact of state.contacts) {
    await client.query(`INSERT INTO contacts (id, tenant_id, trust_id, contact_type, full_name, organization, email, phone, fax_number, status, address_line_1, address_line_2, city, state, postal_code, country, notes, created_at, updated_at, immutable, deleted_at, deleted_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, trust_id = EXCLUDED.trust_id, contact_type = EXCLUDED.contact_type, full_name = EXCLUDED.full_name, organization = EXCLUDED.organization, email = EXCLUDED.email, phone = EXCLUDED.phone, fax_number = EXCLUDED.fax_number, status = EXCLUDED.status, address_line_1 = EXCLUDED.address_line_1, address_line_2 = EXCLUDED.address_line_2, city = EXCLUDED.city, state = EXCLUDED.state, postal_code = EXCLUDED.postal_code, country = EXCLUDED.country, notes = EXCLUDED.notes, updated_at = EXCLUDED.updated_at, immutable = EXCLUDED.immutable, deleted_at = EXCLUDED.deleted_at, deleted_by = EXCLUDED.deleted_by`, [contact.id, resolveTenantIdForTrust(contact.trustId), contact.trustId, contact.contactType, contact.fullName, contact.organization, contact.email, contact.phone, contact.faxNumber || null, contact.status || "ADMINISTRATIVE CONTACTS", contact.addressLine1 || null, contact.addressLine2 || null, contact.city || null, contact.state || null, contact.postalCode || null, contact.country || null, contact.notes || null, contact.createdAt, contact.updatedAt, Boolean(contact.immutable), contact.deletedAt || null, contact.deletedBy || null]);
  }

  const taskIds = state.tasks.map((item) => item.id);
  if (taskIds.length) await client.query(`DELETE FROM tasks WHERE NOT (id = ANY($1::uuid[]))`, [taskIds]);
  else await client.query(`DELETE FROM tasks`);
  for (const task of state.tasks) {
    await client.query(`INSERT INTO tasks (id, tenant_id, trust_id, document_id, contact_id, title, task_type, status, priority, trigger_date, due_date, completed_at, assigned_to, rule_code, custom_day_value, notes, reminders_json, created_at, updated_at, immutable, deleted_at, deleted_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19,$20,$21,$22) ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, trust_id = EXCLUDED.trust_id, document_id = EXCLUDED.document_id, contact_id = EXCLUDED.contact_id, title = EXCLUDED.title, task_type = EXCLUDED.task_type, status = EXCLUDED.status, priority = EXCLUDED.priority, trigger_date = EXCLUDED.trigger_date, due_date = EXCLUDED.due_date, completed_at = EXCLUDED.completed_at, assigned_to = EXCLUDED.assigned_to, rule_code = EXCLUDED.rule_code, custom_day_value = EXCLUDED.custom_day_value, notes = EXCLUDED.notes, reminders_json = EXCLUDED.reminders_json, updated_at = EXCLUDED.updated_at, immutable = EXCLUDED.immutable, deleted_at = EXCLUDED.deleted_at, deleted_by = EXCLUDED.deleted_by`, [task.id, resolveTenantIdForTrust(task.trustId), task.trustId, task.documentId || null, task.contactId || null, task.title, task.taskType, task.status, task.priority, task.triggerDate || null, task.dueDate || null, task.completedAt || null, task.assignedTo || null, task.ruleCode || null, task.customDayValue || null, task.notes || null, JSON.stringify(task.reminders || []), task.createdAt, task.updatedAt, Boolean(task.immutable), task.deletedAt || null, task.deletedBy || null]);
  }
}
