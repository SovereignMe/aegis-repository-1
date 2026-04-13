CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tenants (id, code, name, status)
VALUES ('hlh-tenant', 'HLH', 'HLH Administrative Tenant', 'active')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS trusts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trust_code TEXT NOT NULL,
  trust_name TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'PRIVATE',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, trust_code),
  UNIQUE (id, tenant_id)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_trust_id TEXT;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE timers ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE timers ADD COLUMN IF NOT EXISTS trust_id TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS trust_id TEXT;
ALTER TABLE trust_ledgers ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE exhibit_index ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE trust_ledger_entries ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE accounting_entries ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE authority_chain ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE distributions ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS tenant_id TEXT;

CREATE TABLE IF NOT EXISTS user_trust_memberships (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trust_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, trust_id)
);

WITH discovered_trusts AS (
  SELECT DISTINCT COALESCE(trust_id, 'local-trust') AS trust_id
  FROM (
    SELECT trust_id FROM documents
    UNION ALL SELECT trust_id FROM contacts
    UNION ALL SELECT trust_id FROM tasks
    UNION ALL SELECT trust_id FROM timers
    UNION ALL SELECT trust_id FROM trust_ledgers
    UNION ALL SELECT trust_id FROM exhibit_index
    UNION ALL SELECT trust_id FROM trust_ledger_entries
    UNION ALL SELECT trust_id FROM accounting_entries
    UNION ALL SELECT trust_id FROM authority_chain
    UNION ALL SELECT trust_id FROM beneficiaries
    UNION ALL SELECT trust_id FROM distributions
    UNION ALL SELECT trust_id FROM notices
    UNION ALL SELECT trust_id FROM packets
    UNION ALL SELECT active_trust_id AS trust_id FROM users
  ) scoped
  WHERE COALESCE(trust_id, '') <> ''
)
INSERT INTO trusts (id, tenant_id, trust_code, trust_name, jurisdiction, status)
SELECT
  trust_id,
  'hlh-tenant',
  CASE WHEN trust_id = 'local-trust' THEN 'HLH-FIT' ELSE UPPER(REPLACE(trust_id, '-', '_')) END,
  CASE WHEN trust_id = 'local-trust' THEN 'HLH FUTURE INVESTMENT TRUST' ELSE trust_id END,
  'PRIVATE',
  'active'
FROM discovered_trusts
ON CONFLICT (id) DO NOTHING;

UPDATE users SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'hlh-tenant');
UPDATE users SET active_trust_id = COALESCE(NULLIF(active_trust_id, ''), 'local-trust');
UPDATE integrations SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'hlh-tenant');
UPDATE documents SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'hlh-tenant');
UPDATE contacts SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'hlh-tenant');
UPDATE tasks SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'hlh-tenant');
UPDATE timers SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'hlh-tenant');
UPDATE timers SET trust_id = COALESCE(NULLIF(trust_id, ''), 'local-trust');
UPDATE audit_events SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'hlh-tenant');
UPDATE trust_ledgers SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'hlh-tenant');
UPDATE exhibit_index SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'hlh-tenant');
UPDATE trust_ledger_entries SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'hlh-tenant');
UPDATE accounting_entries SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'hlh-tenant');
UPDATE authority_chain SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'hlh-tenant');
UPDATE beneficiaries SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'hlh-tenant');
UPDATE distributions SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'hlh-tenant');
UPDATE notices SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'hlh-tenant');
UPDATE packets SET tenant_id = COALESCE(NULLIF(tenant_id, ''), 'hlh-tenant');

INSERT INTO user_trust_memberships (user_id, tenant_id, trust_id)
SELECT id, tenant_id, active_trust_id
FROM users
ON CONFLICT (user_id, trust_id) DO NOTHING;

ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN active_trust_id SET NOT NULL;
ALTER TABLE integrations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE contacts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE timers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE audit_events ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE trust_ledgers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE exhibit_index ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE trust_ledger_entries ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE accounting_entries ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE authority_chain ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE beneficiaries ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE distributions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE notices ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE packets ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trusts_tenant_id ON trusts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_trust_memberships_trust_id ON user_trust_memberships(trust_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_trust ON documents(tenant_id, trust_id);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_trust ON contacts(tenant_id, trust_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_trust ON tasks(tenant_id, trust_id);
CREATE INDEX IF NOT EXISTS idx_timers_tenant_trust ON timers(tenant_id, trust_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_trust ON audit_events(tenant_id, trust_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_tenant_fk') THEN
    ALTER TABLE users ADD CONSTRAINT users_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_active_trust_fk') THEN
    ALTER TABLE users ADD CONSTRAINT users_active_trust_fk FOREIGN KEY (active_trust_id, tenant_id) REFERENCES trusts(id, tenant_id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_trust_memberships_trust_fk') THEN
    ALTER TABLE user_trust_memberships ADD CONSTRAINT user_trust_memberships_trust_fk FOREIGN KEY (trust_id, tenant_id) REFERENCES trusts(id, tenant_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'integrations_tenant_fk') THEN
    ALTER TABLE integrations ADD CONSTRAINT integrations_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_trust_scope_fk') THEN
    ALTER TABLE documents ADD CONSTRAINT documents_trust_scope_fk FOREIGN KEY (trust_id, tenant_id) REFERENCES trusts(id, tenant_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_trust_scope_fk') THEN
    ALTER TABLE contacts ADD CONSTRAINT contacts_trust_scope_fk FOREIGN KEY (trust_id, tenant_id) REFERENCES trusts(id, tenant_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_trust_scope_fk') THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_trust_scope_fk FOREIGN KEY (trust_id, tenant_id) REFERENCES trusts(id, tenant_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timers_trust_scope_fk') THEN
    ALTER TABLE timers ADD CONSTRAINT timers_trust_scope_fk FOREIGN KEY (trust_id, tenant_id) REFERENCES trusts(id, tenant_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_events_trust_scope_fk') THEN
    ALTER TABLE audit_events ADD CONSTRAINT audit_events_trust_scope_fk FOREIGN KEY (trust_id, tenant_id) REFERENCES trusts(id, tenant_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trust_ledgers_trust_scope_fk') THEN
    ALTER TABLE trust_ledgers ADD CONSTRAINT trust_ledgers_trust_scope_fk FOREIGN KEY (trust_id, tenant_id) REFERENCES trusts(id, tenant_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exhibit_index_trust_scope_fk') THEN
    ALTER TABLE exhibit_index ADD CONSTRAINT exhibit_index_trust_scope_fk FOREIGN KEY (trust_id, tenant_id) REFERENCES trusts(id, tenant_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trust_ledger_entries_trust_scope_fk') THEN
    ALTER TABLE trust_ledger_entries ADD CONSTRAINT trust_ledger_entries_trust_scope_fk FOREIGN KEY (trust_id, tenant_id) REFERENCES trusts(id, tenant_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounting_entries_trust_scope_fk') THEN
    ALTER TABLE accounting_entries ADD CONSTRAINT accounting_entries_trust_scope_fk FOREIGN KEY (trust_id, tenant_id) REFERENCES trusts(id, tenant_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'authority_chain_trust_scope_fk') THEN
    ALTER TABLE authority_chain ADD CONSTRAINT authority_chain_trust_scope_fk FOREIGN KEY (trust_id, tenant_id) REFERENCES trusts(id, tenant_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'beneficiaries_trust_scope_fk') THEN
    ALTER TABLE beneficiaries ADD CONSTRAINT beneficiaries_trust_scope_fk FOREIGN KEY (trust_id, tenant_id) REFERENCES trusts(id, tenant_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'distributions_trust_scope_fk') THEN
    ALTER TABLE distributions ADD CONSTRAINT distributions_trust_scope_fk FOREIGN KEY (trust_id, tenant_id) REFERENCES trusts(id, tenant_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notices_trust_scope_fk') THEN
    ALTER TABLE notices ADD CONSTRAINT notices_trust_scope_fk FOREIGN KEY (trust_id, tenant_id) REFERENCES trusts(id, tenant_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'packets_trust_scope_fk') THEN
    ALTER TABLE packets ADD CONSTRAINT packets_trust_scope_fk FOREIGN KEY (trust_id, tenant_id) REFERENCES trusts(id, tenant_id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS fax_number TEXT NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ADMINISTRATIVE CONTACTS';
