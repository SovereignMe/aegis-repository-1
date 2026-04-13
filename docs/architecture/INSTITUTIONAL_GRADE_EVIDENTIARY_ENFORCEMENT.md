# Institutional-Grade Evidentiary Enforcement

This pass hardens AEGIS around three enforcement principles:

1. **Quorum is mandatory** for approval-governed actions.
2. **External anchoring is attempted by default** for finalized evidence bundles.
3. **Evidence exports are verification-first artifacts**, not convenience ZIPs.

## Enforced controls
- Unique-actor quorum evaluation on packet approvals
- Quorum failure is fail-closed
- Anchor receipts are generated for finalized bundles
- Anchor receipts are written into the evidence bundle

## Operational expectation
Production deployments should replace the placeholder OpenTimestamps adapter with a live broadcaster and persist the resulting proof/receipt in the artifact record.
