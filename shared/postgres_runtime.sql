-- Runtime relational persistence for PostgreSQL mode.
-- Documents, tasks, timers, and audit events are stored as real tables.

CREATE TABLE IF NOT EXISTS app_state_snapshots (
  snapshot_id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  state_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY,
  trust_id UUID NOT NULL,
  system_id TEXT NOT NULL UNIQUE,
  display_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  exhibit_code TEXT,
  doc_type TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  governing_level TEXT,
  source_type TEXT NOT NULL,
  summary TEXT,
  notes TEXT,
  effective_date DATE,
  updated_at TIMESTAMPTZ NOT NULL,
  ledger_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  trust_id UUID NOT NULL,
  document_id UUID,
  contact_id TEXT,
  title TEXT NOT NULL,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  trigger_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  assigned_to TEXT,
  rule_code TEXT,
  custom_day_value INTEGER,
  notes TEXT,
  reminders JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS timers (
  id UUID PRIMARY KEY,
  related_task_id UUID,
  related_document_id UUID,
  timer_type TEXT NOT NULL,
  label TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  stopped_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by TEXT NOT NULL
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
  previous_hash TEXT,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);


-- RBAC and RLS hardening
CREATE TABLE IF NOT EXISTS role_permissions (
  role_key TEXT NOT NULL,
  action_key TEXT NOT NULL,
  is_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (role_key, action_key)
);

INSERT INTO role_permissions (role_key, action_key, is_allowed) VALUES
  ('VIEWER', 'audit.read', TRUE),
  ('VIEWER', 'export.use', TRUE),
  ('EDITOR', 'documents.create', TRUE),
  ('EDITOR', 'documents.archive', TRUE),
  ('EDITOR', 'intake.create', TRUE),
  ('EDITOR', 'contacts.write', TRUE),
  ('EDITOR', 'tasks.create', TRUE),
  ('EDITOR', 'tasks.complete', TRUE),
  ('EDITOR', 'integrations.sync', TRUE),
  ('EDITOR', 'settings.write', TRUE),
  ('EDITOR', 'timers.start', TRUE),
  ('EDITOR', 'timers.stop', TRUE),
  ('EDITOR', 'audit.read', TRUE),
  ('EDITOR', 'export.use', TRUE),
  ('ADMIN', 'documents.create', TRUE),
  ('ADMIN', 'documents.archive', TRUE),
  ('ADMIN', 'intake.create', TRUE),
  ('ADMIN', 'contacts.write', TRUE),
  ('ADMIN', 'tasks.create', TRUE),
  ('ADMIN', 'tasks.complete', TRUE),
  ('ADMIN', 'integrations.sync', TRUE),
  ('ADMIN', 'settings.write', TRUE),
  ('ADMIN', 'controls.role', TRUE),
  ('ADMIN', 'controls.permissions', TRUE),
  ('ADMIN', 'timers.start', TRUE),
  ('ADMIN', 'timers.stop', TRUE),
  ('ADMIN', 'audit.read', TRUE),
  ('ADMIN', 'export.use', TRUE)
ON CONFLICT (role_key, action_key) DO UPDATE SET is_allowed = EXCLUDED.is_allowed;

CREATE OR REPLACE FUNCTION app_current_role() RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('app.current_role', true), ''), 'VIEWER');
$$;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'documents_read_policy') THEN
    CREATE POLICY documents_read_policy ON documents FOR SELECT USING (app_current_role() IN ('VIEWER','EDITOR','ADMIN'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'documents_write_policy') THEN
    CREATE POLICY documents_write_policy ON documents FOR ALL USING (app_current_role() IN ('EDITOR','ADMIN')) WITH CHECK (app_current_role() IN ('EDITOR','ADMIN'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tasks_read_policy') THEN
    CREATE POLICY tasks_read_policy ON tasks FOR SELECT USING (app_current_role() IN ('VIEWER','EDITOR','ADMIN'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tasks_write_policy') THEN
    CREATE POLICY tasks_write_policy ON tasks FOR ALL USING (app_current_role() IN ('EDITOR','ADMIN')) WITH CHECK (app_current_role() IN ('EDITOR','ADMIN'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'timers' AND policyname = 'timers_read_policy') THEN
    CREATE POLICY timers_read_policy ON timers FOR SELECT USING (app_current_role() IN ('VIEWER','EDITOR','ADMIN'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'timers' AND policyname = 'timers_write_policy') THEN
    CREATE POLICY timers_write_policy ON timers FOR ALL USING (app_current_role() IN ('EDITOR','ADMIN')) WITH CHECK (app_current_role() IN ('EDITOR','ADMIN'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_events' AND policyname = 'audit_events_read_policy') THEN
    CREATE POLICY audit_events_read_policy ON audit_events FOR SELECT USING (app_current_role() IN ('VIEWER','EDITOR','ADMIN'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_events' AND policyname = 'audit_events_write_policy') THEN
    CREATE POLICY audit_events_write_policy ON audit_events FOR INSERT WITH CHECK (app_current_role() IN ('EDITOR','ADMIN'));
  END IF;
END $$;
