CREATE TABLE IF NOT EXISTS app_settings (
  scope_type TEXT NOT NULL,
  scope_id TEXT,
  setting_key TEXT NOT NULL,
  setting_value_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope_type, scope_id, setting_key)
);

CREATE TABLE IF NOT EXISTS permissions (
  role_key TEXT NOT NULL,
  action_key TEXT NOT NULL,
  is_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (role_key, action_key)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_login_at TIMESTAMPTZ,
  password_change_required BOOLEAN NOT NULL DEFAULT TRUE,
  session_version INTEGER NOT NULL DEFAULT 1,
  password_changed_at TIMESTAMPTZ,
  immutable BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS refresh_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by_ip TEXT,
  created_by_user_agent TEXT,
  last_used_ip TEXT,
  last_used_user_agent TEXT,
  session_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY,
  trust_id TEXT NOT NULL,
  contact_type TEXT NOT NULL,
  full_name TEXT NOT NULL,
  organization TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  fax_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ADMINISTRATIVE CONTACTS',
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  notes TEXT,
  immutable BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS trust_ledgers (
  id UUID PRIMARY KEY,
  trust_id TEXT NOT NULL,
  ledger_code TEXT NOT NULL UNIQUE,
  ledger_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  immutable BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY,
  trust_id TEXT NOT NULL,
  system_id TEXT NOT NULL UNIQUE,
  display_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  exhibit_code TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  governing_level TEXT NOT NULL,
  source_type TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  effective_date DATE,
  immutable BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  ledger_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  file_name TEXT,
  original_file_name TEXT,
  mime_type TEXT,
  file_size BIGINT,
  file_hash TEXT,
  storage_path TEXT
);

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  storage_path TEXT,
  file_name TEXT,
  original_file_name TEXT,
  mime_type TEXT,
  file_size BIGINT,
  file_hash TEXT,
  change_summary TEXT,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  immutable BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  created_by TEXT,
  UNIQUE (document_id, version_number)
);

CREATE TABLE IF NOT EXISTS exhibit_index (
  id UUID PRIMARY KEY,
  trust_id TEXT NOT NULL,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  exhibit_code TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  label TEXT NOT NULL,
  immutable BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (document_id),
  UNIQUE (exhibit_code)
);

CREATE TABLE IF NOT EXISTS deadline_rules (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  default_days INTEGER,
  business_day_mode TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  trust_id TEXT NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  trigger_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  assigned_to TEXT,
  rule_code TEXT REFERENCES deadline_rules(code) ON DELETE SET NULL,
  custom_day_value INTEGER,
  notes TEXT,
  reminders_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  immutable BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS timers (
  id UUID PRIMARY KEY,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  related_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  timer_type TEXT NOT NULL,
  label TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  stopped_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by TEXT NOT NULL,
  immutable BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  sequence BIGINT NOT NULL UNIQUE,
  actor TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  previous_hash TEXT,
  hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  account_email TEXT,
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  sync_mode TEXT NOT NULL,
  capabilities_json JSONB NOT NULL DEFAULT '[]'::jsonb
);
