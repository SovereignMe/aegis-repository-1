-- HLH Trust Governance & Administration
-- Production-oriented schema for local-first, cloud-sync-capable, optional multi-user mode.

create extension if not exists pgcrypto;

create table trusts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  short_name text,
  jurisdiction text not null,
  governing_date date,
  ratification_date date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  role_key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  permission_key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  trust_id uuid references trusts(id) on delete set null,
  email text unique,
  display_name text not null,
  role_id uuid references roles(id) on delete set null,
  status text not null default 'active',
  local_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table app_settings (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null,
  scope_id uuid,
  setting_key text not null,
  setting_value_json jsonb not null,
  updated_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (scope_type, scope_id, setting_key)
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  trust_id uuid references trusts(id) on delete cascade,
  contact_type text not null,
  full_name text not null,
  organization text,
  email text,
  phone text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  country text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  trust_id uuid references trusts(id) on delete cascade,
  system_id text not null unique,
  display_id text not null unique,
  title text not null,
  doc_type text not null,
  category text,
  status text not null,
  jurisdiction text not null,
  governing_level text,
  source_type text not null default 'local',
  summary text,
  notes text,
  effective_date date,
  received_date date,
  recorded_date date,
  archived_date date,
  current_version_id uuid,
  owner_user_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  storage_key text not null unique,
  filename text not null,
  mime_type text,
  byte_size bigint not null default 0,
  sha256_hash text,
  uploaded_by uuid references users(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  encryption_status text not null default 'not_encrypted',
  virus_scan_status text not null default 'not_scanned'
);

create table document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  version_number integer not null,
  file_id uuid references files(id) on delete set null,
  content_hash text,
  change_summary text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  is_current boolean not null default false,
  unique (document_id, version_number)
);

alter table documents
  add constraint documents_current_version_fk
  foreign key (current_version_id) references document_versions(id) deferrable initially deferred;

create table exhibits (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  exhibit_code text not null,
  label text,
  sequence_number integer not null,
  linked_file_id uuid references files(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  unique(document_id, exhibit_code)
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text
);

create table document_tags (
  document_id uuid not null references documents(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (document_id, tag_id)
);

create table ledgers (
  id uuid primary key default gen_random_uuid(),
  trust_id uuid references trusts(id) on delete cascade,
  ledger_type text not null,
  name text not null,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references ledgers(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  entry_type text not null,
  reference_code text,
  title text not null,
  description text,
  effective_date date,
  amount numeric(14,2),
  debit_credit_flag text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  trust_id uuid references trusts(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_json jsonb,
  after_json jsonb,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  ip_address inet,
  user_agent text
);

create table ledger_links (
  id uuid primary key default gen_random_uuid(),
  origin_event_id uuid references audit_events(id) on delete set null,
  source_ledger_entry_id uuid not null references ledger_entries(id) on delete cascade,
  linked_ledger_entry_id uuid not null references ledger_entries(id) on delete cascade,
  link_type text not null
);

create table deadline_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  default_days integer,
  business_day_mode text not null default 'calendar',
  description text,
  is_system boolean not null default false
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  trust_id uuid references trusts(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  title text not null,
  task_type text not null,
  status text not null default 'open',
  priority text not null default 'normal',
  trigger_date date,
  due_date date,
  completed_at timestamptz,
  assigned_to uuid references users(id) on delete set null,
  rule_id uuid references deadline_rules(id) on delete set null,
  custom_day_value integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  remind_at timestamptz not null,
  channel text not null,
  status text not null default 'pending',
  sent_at timestamptz
);

create table timers (
  id uuid primary key default gen_random_uuid(),
  related_task_id uuid references tasks(id) on delete set null,
  related_document_id uuid references documents(id) on delete set null,
  timer_type text not null,
  started_at timestamptz not null,
  stopped_at timestamptz,
  duration_seconds integer,
  notes text,
  created_by uuid references users(id) on delete set null
);

create table communications (
  id uuid primary key default gen_random_uuid(),
  trust_id uuid references trusts(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  document_id uuid references documents(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  channel text not null,
  direction text not null,
  subject text,
  body_preview text,
  external_message_id text,
  sent_at timestamptz,
  received_at timestamptz,
  status text,
  created_at timestamptz not null default now()
);

create table integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  account_email text,
  status text not null default 'disconnected',
  connected_at timestamptz,
  disconnected_at timestamptz,
  last_sync_at timestamptz,
  sync_mode text not null default 'manual'
);

create table oauth_accounts (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references integrations(id) on delete cascade,
  provider_user_id text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expiry timestamptz,
  scope_set text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  trust_id uuid references trusts(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  document_id uuid references documents(id) on delete set null,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text,
  status text not null default 'scheduled',
  external_provider text,
  external_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table email_threads (
  id uuid primary key default gen_random_uuid(),
  trust_id uuid references trusts(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  external_provider text,
  external_thread_id text,
  subject text,
  last_message_at timestamptz,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table email_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references email_threads(id) on delete cascade,
  external_message_id text,
  direction text,
  from_address text,
  to_addresses text[],
  cc_addresses text[],
  bcc_addresses text[],
  subject text,
  snippet text,
  body_text text,
  received_at timestamptz,
  sent_at timestamptz,
  labels_json jsonb,
  created_at timestamptz not null default now()
);

create table sync_jobs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references integrations(id) on delete cascade,
  job_type text not null,
  status text not null default 'pending',
  started_at timestamptz,
  finished_at timestamptz,
  cursor_value text,
  error_message text
);
