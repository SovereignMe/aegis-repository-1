# Production-Hardened Release Candidate Summary

## Release-candidate upgrades completed
- Repaired frontend/backend contract drift around auth, bootstrap, MFA, and typed API calls.
- Added a hardened API client with:
  - method helpers (`get/post/put/patch/delete`)
  - auth token storage helpers
  - automatic refresh-on-401 retry
  - safe omission of `Content-Type` for bodyless and `FormData` requests
- Restored missing auth service methods used by the app store and UI flows.
- Aligned backend environment/config handling, including:
  - production/test mode flags
  - access-token signing config
  - refresh cookie config
  - integration feature flags
  - upload/security/rate-limit settings
  - support for `_FILE` secrets
- Fixed backend model/store drift for artifact status persistence.
- Fixed governance verification UI/runtime regressions and missing component import.
- Tightened frontend permission-tab access behavior to satisfy regression expectations.
- Hardened access-token key management:
  - detects mismatched Ed25519 public/private keypairs
  - auto-normalizes verifier material in non-production/test paths
  - fails closed in production when configured signing keys are inconsistent
- Rebuilt the project successfully on Linux after replacing cross-platform dependency drift.

## Validation completed
- `npm run verify:production-ready` ✅
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run test` ✅
- `npm run build` ✅
- `npm run ci` ✅
- `npm run release:stage` ✅
- `npm run release:verify` ✅

## Remaining deployment sign-off item
The codebase now qualifies as a **production-hardened release candidate**. The remaining step before a true production approval is environment sign-off in the target deployment stack:
- validate against the real PostgreSQL service
- verify secrets are injected from the deployment secret manager / `_FILE` paths
- confirm TLS, proxy, secure-cookie, and CSP settings in the live ingress path
- run post-deploy smoke tests for bootstrap-disabled admin flows, auth refresh, MFA, and evidence signing

## Release packaging
Use the staged release under `release-artifacts/source-release/` for distribution. It excludes local data, build artifacts, secrets, and `node_modules`.
