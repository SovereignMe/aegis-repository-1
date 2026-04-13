# External Anchoring + Multi-Signer Quorum

This pass adds the final defensibility layer for AEGIS artifacts and approvals:

- OpenTimestamps / Bitcoin anchoring adapter surface
- multi-signer quorum policy evaluation
- signer key attribution on approvals
- artifact anchor persistence

## Enforcement model
1. A governance action remains pending until quorum is satisfied.
2. Every approval carries signer key metadata and a canonical payload hash.
3. Finalized artifacts can be externally anchored and later verified against the stored anchor receipt.

## Recommended production follow-through
- replace the placeholder anchoring adapter with a live OpenTimestamps or BTC anchor broadcaster
- require role-diverse approvals for distributions and packet finalization
- expose anchor + quorum status in every packet/distribution admin detail view
