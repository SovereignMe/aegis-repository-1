# Public-Proof Anchoring + Artifact Status Persistence

This pass adds an operational artifact-status ledger for packet bundles and evidence bundles.

## What is persisted
- bundle hash
- manifest hash
- public-proof provider
- anchor submission / confirmation state
- verification state
- receipt paths
- last checked time

## Public-proof behavior
AEGIS now attempts OpenTimestamps anchoring by default. If the `ots` CLI is available, the hash is submitted and later verified. If not, the system persists a pending public-proof receipt rather than silently claiming confirmation.

## Status model
- `pending`: artifact generated but not submitted
- `submitted`: external/public-proof attempt recorded
- `confirmed`: external proof verified
- `failed`: submission or verification failed

Verification states are stored separately to distinguish proof confirmation from internal integrity verification.
