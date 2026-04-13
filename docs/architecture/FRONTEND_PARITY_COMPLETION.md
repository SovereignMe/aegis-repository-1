# Frontend Parity Completion

Completed in this pass:
- Shared API contracts for artifact status + mutation responses
- Permission regression tests
- Accessibility regression checks
- CI script for frontend parity

Acceptance criteria:
- `npm --prefix frontend run ci` passes
- governance artifact status is typed from shared contract
- permission regressions fail the build
- baseline accessibility regressions fail the build
