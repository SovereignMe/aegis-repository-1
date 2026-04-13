CREATE TABLE IF NOT EXISTS trust_ledger_entries (
  id UUID PRIMARY KEY,
  trust_id TEXT NOT NULL,
  ledger_id UUID REFERENCES trust_ledgers(id) ON DELETE CASCADE,
  entry_code TEXT NOT NULL UNIQUE,
  entry_type TEXT NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  exhibit_id UUID REFERENCES exhibit_index(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  effective_date DATE NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL,
  immutable BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  metadata_json JSONB
);

CREATE TABLE IF NOT EXISTS accounting_entries (
  id UUID PRIMARY KEY,
  trust_id TEXT NOT NULL,
  ledger_id UUID REFERENCES trust_ledgers(id) ON DELETE CASCADE,
  entry_code TEXT NOT NULL UNIQUE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  distribution_id UUID,
  account_code TEXT NOT NULL,
  direction TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  memo TEXT,
  posted_at TIMESTAMPTZ NOT NULL,
  immutable BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS authority_chain (
  id UUID PRIMARY KEY,
  trust_id TEXT NOT NULL,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  authority_type TEXT NOT NULL,
  parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  validated_at TIMESTAMPTZ NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS beneficiaries (
  id UUID PRIMARY KEY,
  trust_id TEXT NOT NULL,
  beneficiary_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  beneficiary_type TEXT NOT NULL,
  status TEXT NOT NULL,
  allocation_percent NUMERIC(8,2) NOT NULL DEFAULT 0,
  notes TEXT,
  immutable BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS distributions (
  id UUID PRIMARY KEY,
  trust_id TEXT NOT NULL,
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE RESTRICT,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  request_code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  immutable BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY,
  trust_id TEXT NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  notice_code TEXT NOT NULL UNIQUE,
  notice_type TEXT NOT NULL,
  service_method TEXT NOT NULL,
  status TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  served_at TIMESTAMPTZ,
  due_date DATE,
  tracking_number TEXT,
  recipient_name TEXT NOT NULL,
  recipient_address TEXT,
  notes TEXT,
  immutable BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS packets (
  id UUID PRIMARY KEY,
  trust_id TEXT NOT NULL,
  packet_code TEXT NOT NULL UNIQUE,
  packet_type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  document_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  notice_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ledger_entry_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  exhibit_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL,
  generated_by TEXT NOT NULL,
  manifest_path TEXT
);
