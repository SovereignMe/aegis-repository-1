-- External anchoring + quorum enforcement foundation
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS signer_key_id TEXT;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS signature_payload_hash TEXT;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS signature_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS quorum_group_id TEXT;

CREATE TABLE IF NOT EXISTS artifact_anchors (
  id UUID PRIMARY KEY,
  trust_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  anchor_hash TEXT NOT NULL,
  anchor_ref TEXT,
  proof TEXT,
  anchored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_quorum_policies (
  id UUID PRIMARY KEY,
  trust_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  minimum_approvals INTEGER NOT NULL DEFAULT 2,
  required_roles_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  unique_actors_only BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
