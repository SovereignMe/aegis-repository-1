# Key Rotation Runbook

## Rotate Immediately After Exposure
- Bootstrap API key
- Access token signing key
- Refresh/session signing or encryption secrets
- Evidence signing key
- Any SMTP, storage, database, or third-party API credentials present in historical bundles

## Procedure
1. Revoke exposed credentials in the secret manager.
2. Generate replacement keys outside the repo.
3. Update environment bindings in the deployment platform.
4. Restart services and invalidate existing sessions if auth material changed.
5. Re-run packet verification with the new active key identifiers.
6. Record rotation timestamp, operator, reason, and affected systems in the audit log.

## Verification
- Confirm bootstrap endpoint rejects the retired key.
- Confirm new sessions are issued with the new key identifier.
- Confirm evidence exports reference the new signing key identifier.
