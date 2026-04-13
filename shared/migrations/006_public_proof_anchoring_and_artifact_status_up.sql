CREATE TABLE IF NOT EXISTS artifact_statuses (
  id uuid PRIMARY KEY,
  tenant_id text NOT NULL,
  trust_id text NOT NULL,
  artifact_type text NOT NULL,
  artifact_id text NOT NULL,
  packet_id text NULL,
  bundle_path text NULL,
  bundle_hash text NULL,
  manifest_hash text NULL,
  public_proof_provider text NOT NULL DEFAULT 'opentimestamps',
  status text NOT NULL DEFAULT 'pending',
  verification_status text NOT NULL DEFAULT 'pending',
  anchor_ref text NULL,
  anchor_proof text NULL,
  anchor_receipt_path text NULL,
  verification_receipt_path text NULL,
  failure_reason text NULL,
  last_checked_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artifact_statuses_trust_id_idx ON artifact_statuses (trust_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS artifact_statuses_artifact_id_idx ON artifact_statuses (artifact_id);
