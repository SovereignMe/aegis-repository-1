# HLH FUTURE INVESTMENT TRUST

## Security assurance

A formal assurance layer is now wired into CI and release gating. See `SECURITY_ASSURANCE.md` for the full control set, including SAST, dependency scanning, secret scanning, SBOM generation, and conditional container/image scanning.

## Governance Operating System

This revision hardens the project delivery workflow so the application can be installed from a clean checkout and verified automatically on every commit.

## What changed

- removed shipped `node_modules` from the deliverable model and added `.gitignore` coverage
- added a real root workspace with a single root lockfile for reproducible installs
- removed nested package lockfiles from workspace packages
- aligned GitHub Actions CI at `.github/workflows/ci.yml` with clean-clone root execution
- added backend ESLint + TypeScript linting
- added frontend ESLint for the React/Vite app
- added backend unit tests for authentication, permissions, and admin-only operational controls
- added frontend unit tests for permission utilities
- verified clean install and production builds from a fresh dependency install

## Workspace commands

Run everything from the repository root:

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm run ci
```

`npm run ci` executes the same validation chain used in GitHub Actions:

1. typecheck
2. lint
3. unit tests
4. production build

## Package-specific commands

### Backend

```bash
cd backend
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
```

Note: the frontend remains a JavaScript/Vite app. The backend has full TypeScript compile validation; the frontend now participates in CI through linting, tests, and production builds.

## Initial access and account provisioning

The backend no longer ships with a seeded default administrator credential.

First-run access is established through the secure bootstrap flow:

1. start the backend
2. open the app
3. in staging and production, supply the configured bootstrap API key
4. complete `/auth/bootstrap-admin` through the bootstrap screen to create the first administrator

After bootstrap:

- self-registration and anonymous account creation are disabled
- new user accounts must be created by an authenticated administrator through the managed user provisioning flow
- diagnostics and backup verification endpoints require authenticated administrator access
- metrics require authenticated administrator access by default; set `METRICS_ACCESS_MODE=private-or-admin` only when you intentionally want private-network scraping without admin credentials

## Backend environment

Copy `backend/.env.example` to `.env` and set at minimum:

```bash
PORT=4000
STORAGE_MODE=postgres
SESSION_SECRET=replace-with-long-random-secret
ENCRYPTION_KEY=replace-with-long-random-secret
FILE_METADATA_SIGNING_PRIVATE_KEY_FILE=/run/secrets/file_metadata_signing_private_key.pem
FILE_METADATA_SIGNING_PUBLIC_KEY_FILE=/run/secrets/file_metadata_signing_public_key.pem
FILE_METADATA_SIGNING_KEY_ID=metadata-ed25519-k1
EVIDENCE_SIGNING_PRIVATE_KEY_FILE=/run/secrets/evidence_signing_private_key.pem
EVIDENCE_SIGNING_PUBLIC_KEY_FILE=/run/secrets/evidence_signing_public_key.pem
EVIDENCE_SIGNING_KEY_ID=evidence-ed25519-k1
EVIDENCE_TIMESTAMP_MODE=local-equivalent
BOOTSTRAP_API_KEY=replace-with-long-random-secret
```

Production storage posture:

```bash
DATABASE_URL=postgres://postgres:password@db:5432/hlh_trust_governance
STORAGE_MODE=postgres
```

Development-only local state options:

```bash
DATA_DIR=./data
STATE_FILE=./data/local-state.json
UPLOADS_DIR=./data/uploads
```


## Windows install notes
Use the root workspace for reproducible installs and CI validation:

```
npm ci
npm run ci
```

You can still run individual packages directly when developing locally.

Backend:
```
cd backend
npm install
npm run dev
```

Frontend:
```
cd frontend
npm install
npm run dev
```


## Security-sensitive operational endpoints

- `GET /admin/diagnostics` requires administrator authentication
- `POST /admin/diagnostics/backups/verify` requires administrator authentication
- `GET /metrics` requires administrator authentication by default
- set `METRICS_ACCESS_MODE=private-or-admin` to allow metrics collection from loopback/private network callers without admin credentials

## Environment hardening

Outside development, the backend now refuses startup unless these secrets are explicitly supplied through environment variables or mounted `*_FILE` secrets:

- `SESSION_SECRET`
- `ENCRYPTION_KEY`
- `FILE_METADATA_SIGNING_PRIVATE_KEY` / `FILE_METADATA_SIGNING_PUBLIC_KEY`
- `EVIDENCE_SIGNING_PRIVATE_KEY` / `EVIDENCE_SIGNING_PUBLIC_KEY`
- `BOOTSTRAP_API_KEY`

That removes insecure fallback behavior in staging and production for session, encryption, manifest signing, evidence signing, and bootstrap access control.

## Clean release packaging

The repository now includes a deterministic release staging flow that produces a source-only deliverable and verifies that runtime baggage is not shipped.

From the repository root:

```bash
npm run release
```

That command will:

1. stage a clean release under `release-artifacts/trust-governance-app`
2. exclude shipped runtime/dependency artifacts such as:
   - `node_modules`
   - `dist`
   - `coverage`
   - local runtime state under `data/` and `backend/data/`
3. generate `RELEASE_MANIFEST.json`
4. verify the staged tree before packaging

This keeps the repository truthful: CI validates buildability from source, while release packaging ships only the source and operational documents required to reproduce the build from a clean clone.


## Production storage guarantees

Production and staging now treat **Postgres as the required primary store**. The backend will refuse startup outside development unless `STORAGE_MODE=postgres` and a valid `DATABASE_URL` are supplied. File storage remains available for local development and tightly controlled recovery workflows only.

Formal storage and recovery guidance now lives in `PRODUCTION_STORAGE.md`, including:
- transaction boundaries
- locking assumptions
- backup and retention strategy
- restore drills and recovery objectives
- recommended production operating model

## Security and operations hardening

This release tightens runtime security and operational controls:
- structured request validation with shared typed route contracts and common error response schemas
- stricter HTTP response headers and CSP controls
- explicit proxy trust and private-network handling through `TRUST_PROXY` and `TRUSTED_PROXY_CIDRS`
- backup verification plus restore drills
- immutable evidence-bundle verification CLI
- managed key rotation command for Ed25519 signing keys
- access tokens are now issued and verified through the standard `jose` JWT implementation using Ed25519 (`EdDSA`) instead of a bespoke token codec

### Key runtime environment variables
- `TRUST_PROXY=false|true`
- `TRUSTED_PROXY_CIDRS=loopback,private,10.0.0.0/8`
- `CONTENT_SECURITY_POLICY=...`
- `CSP_REPORT_ONLY=false|true`

### Operations commands
From `backend/`:
- `npm run ops:backup-drill`
- `npm run verify:bundle -- <bundle-dir> [bundle.zip]`
- `npm run keys:rotate -- access`
- `npm run keys:rotate -- evidence`


## Extended automated assurance

The repository now includes additional automated coverage layers beyond unit and integration testing:

- browser E2E coverage for bootstrap, password rotation, MFA enrollment, re-login with MFA, and governance packet generation
- negative-path authorization coverage across sensitive routes
- lightweight load tests for auth and document upload paths
- restore-drill assertions that can run in CI or staged environments

Useful commands:

- `npm run test:e2e`
- `npm run test:load:auth`
- `npm run test:load:upload`
- `npm run test:restore-drill`


## Observability hardening
- Metrics labels are normalized to bounded enums and sanitized route templates to avoid cardinality blowups.
- Security event dashboards and starter alert thresholds are provided under `ops/observability/`.
- Deployment guidance for routing `audit-log` separately from `app-log` is documented in `OBSERVABILITY.md`.


## Platform Boundary

This platform is expressly scoped to **administrative governance and evidence control**. It supports trust administration workflows, records governance, packet assembly, and evidentiary preservation. It does **not** provide legal adjudication, decide legal sufficiency, or replace independent counsel.


## New hardening included
- External anchoring adapter surface (OpenTimestamps / Bitcoin-ready)
- Multi-signer quorum policy foundation for approvals
- Artifact anchor persistence and signer key metadata
