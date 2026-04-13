CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY,
  trust_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  stage TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  decision TEXT NOT NULL,
  notes TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  immutable BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE distributions ADD COLUMN IF NOT EXISTS requested_by TEXT;
ALTER TABLE distributions ADD COLUMN IF NOT EXISTS requested_by_role TEXT;
ALTER TABLE distributions ADD COLUMN IF NOT EXISTS reason_code TEXT;
ALTER TABLE distributions ADD COLUMN IF NOT EXISTS required_approvals INTEGER NOT NULL DEFAULT 0;
ALTER TABLE distributions ADD COLUMN IF NOT EXISTS approval_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE distributions ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1;

ALTER TABLE packets ADD COLUMN IF NOT EXISTS generated_by_role TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS reason_code TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS required_approvals INTEGER NOT NULL DEFAULT 0;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS approval_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS bundle_dir TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS bundle_path TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS manifest_signature TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS bundle_signature TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS manifest_hash TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS bundle_hash TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS timestamp_path TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS timestamp_token TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS timestamp_authority TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS manifest_key_id TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS verification_summary_path TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS export_watermark TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS anchored_at TIMESTAMPTZ;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS hash_anchor_receipt TEXT;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS immutable BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE packets ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_distributions_trust_status_version ON distributions(trust_id, status, version_no);
CREATE INDEX IF NOT EXISTS idx_packets_trust_status_version ON packets(trust_id, status, version_no);
CREATE INDEX IF NOT EXISTS idx_approvals_target ON approvals(target_type, target_id, created_at DESC);
