# Postgres-authoritative runtime plan

AEGIS Governance now treats Postgres as the authoritative state backbone for governance mutations rather than an optional persistence sink behind an in-memory core.

## What changed in this pass

- Governance state slices for approvals, packets, distributions, notices, ledger entries, accounting entries, beneficiaries, and authority-chain records are loaded from and persisted to Postgres.
- Unit-of-work boundaries now flush the full state into the same open Postgres transaction before `COMMIT`.
- Distribution approvals and packet approvals now support row locking with `SELECT ... FOR UPDATE` when Postgres is active.
- Optimistic version fields (`version_no`) have been added for packets and distributions.
- Migration-driven schema evolution now includes the authoritative governance runtime expansion in `004_postgres_authoritative_runtime_up.sql`.

## Transaction model

The required posture for governance writes is:

1. Open transaction.
2. Lock the row or rows that define the current decision boundary.
3. Re-read the authoritative record inside the transaction.
4. Recompute policy requirements and approval counts.
5. Apply the write.
6. Persist audit and dependent records in the same transaction.
7. Commit.

This is now the default path for:

- distribution approval
- packet approval
- governance write persistence during `withUnitOfWork`

## Concurrency posture

### Explicit locking

Use row locks for:

- approvals against the same packet
- approvals against the same distribution
- packet finalization / anchoring
- distributions that emit accounting entries

### Version checks

`version_no` should be incremented on every material governance mutation. That enables:

- API-level optimistic concurrency controls via `If-Match` or explicit version submission
- deterministic audit/export verification
- safer split-brain detection between UI state and DB state

## Remaining work after this pass

This pass moves the backbone in the correct direction, but a full cutover still should complete these items:

- remove file-mode persistence from all non-test execution paths
- move document upload metadata and evidence-manifest records into dedicated normalized tables
- add API-level version preconditions on packet/distribution mutation routes
- add explicit transaction-scoped repositories for packet finalization and distribution payment execution
- enforce advisory/row locks for approval fan-in and export anchoring jobs
- externalize all seed/demo loading into fixtures rather than runtime bootstrap state

## Release gate expectation

A release should not be called production-ready unless:

- migrations run cleanly on a blank Postgres database
- `npm ci && npm run ci` passes from a clean checkout
- Postgres is the active storage mode for deployed environments
- packet/distribution approval races are covered by integration tests against Postgres


## DB-only enforcement

As of this pass, file-backed mutation paths are permitted only when `AEGIS_TEST_MODE=1` (or `NODE_ENV=test`) for isolated automated tests. All non-test runtime paths require `STORAGE_MODE=postgres` and `DATABASE_URL`, and the unit-of-work layer will reject non-Postgres mutation attempts before a state write occurs.
