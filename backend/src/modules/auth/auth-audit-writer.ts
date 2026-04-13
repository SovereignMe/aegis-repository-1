import type { AppUser, AuthenticatedUser } from "../../models/domain.js";
import { auditChainWriter } from "../audit/audit-chain-writer.js";
import { getSecuritySettings } from "./crypto-helpers.js";

export class AuthAuditWriter {
  writeAlert(user: AppUser | null, event: string, metadata: Record<string, unknown> = {}, actor = "AUTH-SYSTEM") {
    const security = getSecuritySettings();
    if (security.auditAlertsEnabled === false) return;
    auditChainWriter.write("AUTH_ALERT", user ? "user" : "auth", user?.id || null, null, { event, ...metadata }, undefined, actor);
  }

  writeSessionRevoked(currentUser: AuthenticatedUser, sessionId: string, userId: string) {
    auditChainWriter.write("AUTH_SESSION_REVOKED", "session", sessionId, null, { userId }, undefined, `USER:${currentUser.email}`);
  }

  writeOtherSessionsRevoked(currentUser: AuthenticatedUser, revokedCount: number) {
    auditChainWriter.write("AUTH_OTHER_SESSIONS_REVOKED", "user", currentUser.id, null, { revokedCount }, undefined, `USER:${currentUser.email}`);
  }

  writeBootstrapAdmin(user: AppUser, metadata: { ip?: string | null } = {}) {
    auditChainWriter.write("AUTH_BOOTSTRAP_ADMIN", "user", user.id, null, { email: user.email, role: user.role }, { ip: metadata.ip || null }, `USER:${user.email}`);
  }

  writeLogin(user: AppUser, sessionId: string, metadata: { ip?: string | null } = {}, details: { keyId: string; mfaSatisfied: boolean; signingAlgorithm?: string; signerIdentity?: string; signerVersion?: string }) {
    auditChainWriter.write("AUTH_LOGIN", "user", user.id, null, { email: user.email, sessionId, keyId: details.keyId, mfaSatisfied: details.mfaSatisfied, signingAlgorithm: details.signingAlgorithm || null, signerIdentity: details.signerIdentity || null, signerVersion: details.signerVersion || null }, { ip: metadata.ip || null }, `USER:${user.email}`);
  }

  writePasswordChanged(user: AppUser, revokedSessionCount: number, retainedSessionId: string) {
    auditChainWriter.write("AUTH_PASSWORD_CHANGED", "user", user.id, null, { email: user.email, revokedSessionCount, sessionVersion: user.sessionVersion, retainedSessionId }, undefined, `USER:${user.email}`);
  }

  writeMfaEnabled(user: AppUser) {
    auditChainWriter.write("AUTH_MFA_ENABLED", "user", user.id, null, { email: user.email }, undefined, `USER:${user.email}`);
  }

  writeUserCreated(user: AppUser, actorEmail: string) {
    auditChainWriter.write("AUTH_USER_CREATED", "user", user.id, null, { email: user.email, role: user.role }, undefined, `USER:${actorEmail}`);
  }
}

export const authAuditWriter = new AuthAuditWriter();
