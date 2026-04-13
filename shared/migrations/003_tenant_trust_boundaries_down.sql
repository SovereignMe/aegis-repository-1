DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'packets_trust_scope_fk') THEN ALTER TABLE packets DROP CONSTRAINT packets_trust_scope_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notices_trust_scope_fk') THEN ALTER TABLE notices DROP CONSTRAINT notices_trust_scope_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'distributions_trust_scope_fk') THEN ALTER TABLE distributions DROP CONSTRAINT distributions_trust_scope_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beneficiaries_trust_scope_fk') THEN ALTER TABLE beneficiaries DROP CONSTRAINT beneficiaries_trust_scope_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'authority_chain_trust_scope_fk') THEN ALTER TABLE authority_chain DROP CONSTRAINT authority_chain_trust_scope_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounting_entries_trust_scope_fk') THEN ALTER TABLE accounting_entries DROP CONSTRAINT accounting_entries_trust_scope_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trust_ledger_entries_trust_scope_fk') THEN ALTER TABLE trust_ledger_entries DROP CONSTRAINT trust_ledger_entries_trust_scope_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exhibit_index_trust_scope_fk') THEN ALTER TABLE exhibit_index DROP CONSTRAINT exhibit_index_trust_scope_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trust_ledgers_trust_scope_fk') THEN ALTER TABLE trust_ledgers DROP CONSTRAINT trust_ledgers_trust_scope_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_events_trust_scope_fk') THEN ALTER TABLE audit_events DROP CONSTRAINT audit_events_trust_scope_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timers_trust_scope_fk') THEN ALTER TABLE timers DROP CONSTRAINT timers_trust_scope_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_trust_scope_fk') THEN ALTER TABLE tasks DROP CONSTRAINT tasks_trust_scope_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_trust_scope_fk') THEN ALTER TABLE contacts DROP CONSTRAINT contacts_trust_scope_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_trust_scope_fk') THEN ALTER TABLE documents DROP CONSTRAINT documents_trust_scope_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'integrations_tenant_fk') THEN ALTER TABLE integrations DROP CONSTRAINT integrations_tenant_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_trust_memberships_trust_fk') THEN ALTER TABLE user_trust_memberships DROP CONSTRAINT user_trust_memberships_trust_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_active_trust_fk') THEN ALTER TABLE users DROP CONSTRAINT users_active_trust_fk; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_tenant_fk') THEN ALTER TABLE users DROP CONSTRAINT users_tenant_fk; END IF;
END $$;

DROP TABLE IF EXISTS user_trust_memberships;
DROP TABLE IF EXISTS trusts;
DROP TABLE IF EXISTS tenants;
