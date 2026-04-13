# AEGIS Governance Threat Model

## Scope
This document defines release-critical threat assumptions for AEGIS Governance across trust boundaries, packet signing, evidence verification, admin bootstrap, session and MFA lifecycle, and file ingestion/quarantine.

## Security Objectives
- Preserve integrity of governance records and exported packets.
- Prevent unauthorized bootstrap, session replay, and privilege escalation.
- Ensure evidence ingestion cannot silently contaminate runtime state or release artifacts.
- Keep secrets externalized and rotatable without rebuilding the application.

## Trust Boundaries
1. **Browser to API**: authenticated session boundary enforced with signed access tokens, refresh tokens, CSRF-aware cookie handling, and role-based authorization.
2. **API to persistence**: runtime state, uploads, and evidence artifacts must never be bundled into source releases.
3. **Signing boundary**: packet manifests and evidence verification keys must come from managed keystores, not repo-local files.
4. **Admin bootstrap boundary**: bootstrap API key is only valid before first admin provisioning and must be rotated after any accidental disclosure.

## Primary Threats and Controls
### 1. Trust boundary assumptions
- Threat: a packaged runtime snapshot leaks session state or administrative data.
- Control: release verification fails on `backend/data`, upload caches, evidence bundles, `.env`, databases, `dist`, and `node_modules`.

### 2. Packet signing
- Threat: manifests are mutable after export or signed with unverifiable keys.
- Control: immutable release manifests, signed build artifacts, managed key identifiers, and documented rotation cadence.

### 3. Evidence verification
- Threat: evidence payloads are modified after ingestion or MIME type is spoofed.
- Control: content sniffing, quarantine workflow, hash verification, malware scanning hooks, and manifest verification before export.

### 4. Admin bootstrap
- Threat: unauthorized first-user creation through leaked bootstrap credentials.
- Control: bootstrap endpoint gated outside development, constant-time secret comparison, post-bootstrap credential rotation, and audit logging.

### 5. Session and MFA lifecycle
- Threat: replayed refresh tokens, stale sessions, or MFA bypass.
- Control: session revocation, session versioning, MFA challenge expiry, explicit refresh-token rotation, and audit alerts on auth-fingerprint changes.

### 6. File ingestion and quarantine
- Threat: hostile uploads land in production bundles or active stores before validation.
- Control: quarantine-first ingestion, separated temp paths, malware scan hook, MIME validation, and explicit operator promotion into governed storage.

## Provenance and Audit Guarantees
- Release artifacts must be source-only or built inside target containers.
- Every release must include a manifest describing commit, dependency lockfile, and verification status.
- Build signing keys must be rotated with documented runbooks and secrets kept only in external secret managers.

## Runbook Requirements
- **Secret rotation**: bootstrap keys, session signing keys, evidence signing keys, and API credentials.
- **Incident response**: invalidate sessions, rotate secrets, purge staged artifacts, rebuild from clean `npm ci`.
- **Release checklist**: clean install, typecheck, release verification, stage source-only artifact, sign manifest.
