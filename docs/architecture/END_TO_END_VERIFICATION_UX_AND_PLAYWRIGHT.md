# End-to-End Verification UX + Playwright Workflow Enforcement

## Purpose
This pass promotes verification from a passive backend capability into an operator-visible workflow with enforced UI regression coverage.

## Delivered
- Verification Workflow Panel in the governance verification workspace
- Playwright verification journey test
- CI gate for verification UX workflow

## Acceptance Criteria
- Verification workspace shows operator-readable status for verification, signatures, anchors, and artifact counts
- Operators can discover verification and anchor review actions without repository deep-linking
- Playwright fails if the governed verification workflow disappears or regresses
- CI fails on broken verification UX paths

## Release Gate
`npm run test:e2e:verification`
