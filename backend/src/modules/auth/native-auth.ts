import crypto from "node:crypto";
import { env } from "../../config/env.js";
import type { AppUser, AuthenticatedUser, RefreshSession } from "../../models/domain.js";
import { db } from "../../store/governance-store.js";
import { DEFAULT_TENANT_ID, DEFAULT_TRUST_ID, normalizeTrustIds, resolveUserTenant } from "../../services/tenancy.service.js";
import { authSessionRepository } from "./session-repository.js";
import { authUserRepository } from "./user-repository.js";
import { mfaDomainService } from "./mfa-domain-service.js";
import { getSecuritySettings, hashPassword, nowIso } from "./crypto-helpers.js";
import { authAuditWriter } from "./auth-audit-writer.js";
import { accessTokenService } from "./access-token-service.js";

const BREACHED_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789", "qwerty123",
  "letmein", "admin123", "changeme", "welcome123", "iloveyou", "trustno1",
]);

function passwordComplexityMessage(securitySettings: Record<string, any>) {
  const checks = [];
  if (Number(securitySettings.passwordMinLength || 14) > 0) checks.push(`at least ${Number(securitySettings.passwordMinLength || 14)} characters`);
  if (securitySettings.requireUppercase !== false) checks.push("one uppercase letter");
  if (securitySettings.requireLowercase !== false) checks.push("one lowercase letter");
  if (securitySettings.requireNumber !== false) checks.push("one number");
  if (securitySettings.requireSymbol !== false) checks.push("one symbol");
  return `Password must contain ${checks.join(", ")}.`;
}


function authError(message: string, statusCode = 400, code = "AUTH_ERROR", extras: Record<string, unknown> = {}) {
  return Object.assign(new Error(message), { statusCode, code, ...extras });
}

export function toAuthenticatedUser(user: AppUser, sessionId: string | null = null): AuthenticatedUser {
  const securitySettings = getSecuritySettings();
  return {
    id: user.id,
    tenantId: user.tenantId || DEFAULT_TENANT_ID,
    trustIds: normalizeTrustIds(user.trustIds || [user.activeTrustId || DEFAULT_TRUST_ID]),
    activeTrustId: user.activeTrustId || DEFAULT_TRUST_ID,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    mustChangePassword: Boolean(user.passwordChangeRequired),
    sessionId,
    sessionVersion: user.sessionVersion || 1,
    mfaEnabled: Boolean(user.mfaEnabled),
    mfaSetupRequired: Boolean(user.role === "ADMIN" && securitySettings.requireAdminMfa !== false && !user.mfaEnabled),
  };
}

function sanitizeUser(user: AppUser) {
  return {
    id: user.id,
    tenantId: user.tenantId || DEFAULT_TENANT_ID,
    trustIds: normalizeTrustIds(user.trustIds || [user.activeTrustId || DEFAULT_TRUST_ID]),
    activeTrustId: user.activeTrustId || DEFAULT_TRUST_ID,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt || null,
    passwordChangeRequired: Boolean(user.passwordChangeRequired),
    sessionVersion: user.sessionVersion || 1,
    passwordChangedAt: user.passwordChangedAt || null,
    failedLoginCount: user.failedLoginCount || 0,
    lockedUntil: user.lockedUntil || null,
    lockoutCount: user.lockoutCount || 0,
    disabledAt: user.disabledAt || null,
    disabledReason: user.disabledReason || null,
    mfaEnabled: Boolean(user.mfaEnabled),
    mfaEnrolledAt: user.mfaEnrolledAt || null,
  };
}

export class AuthService {
  static readonly LEGACY_DEFAULT_ADMIN_EMAIL = "admin@hlh-trust.local";
  static readonly LEGACY_DEFAULT_ADMIN_PASSWORD = "ChangeThisPassword!";
  static readonly LEGACY_DEFAULT_ADMIN_ALIASES = ["admin@hlh-trust.local", "admin@example.com"];
  static readonly CLOCK_SKEW_SECONDS = 30;
  static readonly MAX_CONCURRENT_SESSIONS = 8;

  private claimNow() {
    return Math.floor(Date.now() / 1000);
  }

  private getUserSessionVersion(user: AppUser): number {
    return user.sessionVersion || 1;
  }

  private getRefreshSessionById(sessionId?: string | null): RefreshSession | null {
    if (!sessionId) return null;
    return authSessionRepository.getById(sessionId);
  }

  private markSessionUsed(session: RefreshSession, metadata: { ip?: string | null; userAgent?: string | null } = {}) {
    authSessionRepository.markUsed(session, metadata);
  }

  private revokeSessionById(sessionId?: string | null) {
    return authSessionRepository.revokeById(sessionId);
  }

  private auditAuthAlert(user: AppUser | null, event: string, metadata: Record<string, unknown> = {}, actor = "AUTH-SYSTEM") {
    authAuditWriter.writeAlert(user, event, metadata, actor);
  }

  private validatePasswordPolicy(password: string, options: { email?: string; fullName?: string } = {}) {
    const securitySettings = getSecuritySettings();
    const minimumLength = Number(securitySettings.passwordMinLength || 14);
    if (password.length < minimumLength) {
      const error = new Error(passwordComplexityMessage(securitySettings)) as Error & { statusCode?: number };
      error.statusCode = 400;
      throw error;
    }
    if (securitySettings.requireUppercase !== false && !/[A-Z]/.test(password)) throw Object.assign(new Error(passwordComplexityMessage(securitySettings)), { statusCode: 400 });
    if (securitySettings.requireLowercase !== false && !/[a-z]/.test(password)) throw Object.assign(new Error(passwordComplexityMessage(securitySettings)), { statusCode: 400 });
    if (securitySettings.requireNumber !== false && !/\d/.test(password)) throw Object.assign(new Error(passwordComplexityMessage(securitySettings)), { statusCode: 400 });
    if (securitySettings.requireSymbol !== false && !/[^A-Za-z0-9]/.test(password)) throw Object.assign(new Error(passwordComplexityMessage(securitySettings)), { statusCode: 400 });
    if (securitySettings.breachedPasswordScreening !== false) {
      const normalized = password.trim().toLowerCase();
      const fragments = [options.email || "", options.fullName || ""].join(" ").toLowerCase();
      if (BREACHED_PASSWORDS.has(normalized) || (normalized.length >= 8 && fragments && fragments.replace(/[^a-z0-9]/g, "").includes(normalized.replace(/[^a-z0-9]/g, "")))) {
        throw authError("Password does not meet secure credential standards. Choose a more unique secret.", 400, "PASSWORD_POLICY_REJECTED");
      }
    }
  }

  private isUserLocked(user: AppUser): boolean {
    return Boolean(user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now());
  }

  private assertLoginAllowed(user: AppUser, metadata: { ip?: string | null; userAgent?: string | null } = {}) {
    if (user.disabledAt) {
      this.auditAuthAlert(user, "account-disabled-login-attempt", { ip: metadata.ip || null, reason: user.disabledReason || null });
      throw authError("Access is restricted for this account. Contact an administrator for review.", 403, "ACCOUNT_DISABLED", { accessState: "disabled" });
    }
    if (this.isUserLocked(user)) {
      this.auditAuthAlert(user, "locked-account-login-attempt", { ip: metadata.ip || null, lockedUntil: user.lockedUntil || null });
      const error = new Error(`Account is temporarily locked until ${user.lockedUntil}.`) as Error & { statusCode?: number };
      error.statusCode = 423;
      throw error;
    }
  }

  private recordFailedAuth(user: AppUser | null, metadata: { ip?: string | null; userAgent?: string | null } = {}, reason = "invalid-credentials") {
    if (!user) return;
    const security = getSecuritySettings();
    const maxFailed = Number(security.maxFailedLoginAttempts || 5);
    const lockoutMinutes = Number(security.lockoutMinutes || 15);
    const disableAfterLockouts = Number(security.disableAfterLockouts || 3);
    user.failedLoginCount = (user.failedLoginCount || 0) + 1;
    user.updatedAt = nowIso();
    if ((user.failedLoginCount || 0) >= maxFailed) {
      user.failedLoginCount = 0;
      user.lockoutCount = (user.lockoutCount || 0) + 1;
      user.lockedUntil = new Date(Date.now() + lockoutMinutes * 60_000).toISOString();
      this.auditAuthAlert(user, "account-locked", { ip: metadata.ip || null, reason, lockoutCount: user.lockoutCount, lockedUntil: user.lockedUntil });
      if ((user.lockoutCount || 0) >= disableAfterLockouts) {
        user.disabledAt = nowIso();
        user.disabledReason = "Automatic disablement after repeated lockouts";
        this.auditAuthAlert(user, "account-disabled", { ip: metadata.ip || null, reason: user.disabledReason, lockoutCount: user.lockoutCount });
      }
    } else if ((user.failedLoginCount || 0) >= Math.max(2, maxFailed - 2)) {
      this.auditAuthAlert(user, "elevated-failed-auth", { ip: metadata.ip || null, reason, failedLoginCount: user.failedLoginCount });
    }
  }

  private clearFailedAuth(user: AppUser) {
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    user.updatedAt = nowIso();
  }

  private buildMfaChallengeToken(user: AppUser) {
    const expiresAt = Date.now() + (5 * 60 * 1000);
    const nonce = crypto.randomBytes(16).toString("hex");
    const payload = `${user.id}.${expiresAt}.${nonce}`;
    const signature = crypto.createHmac("sha256", env.sessionSecret).update(payload).digest("base64url");
    return Buffer.from(`${payload}.${signature}`, "utf8").toString("base64url");
  }

  private verifyMfaChallengeToken(token?: string | null) {
    const decoded = Buffer.from(String(token || ""), "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 4) throw authError("AEGIS verification has expired or is no longer valid. Start sign-in again to continue.", 401, "INVALID_MFA_CHALLENGE", { accessState: "verification_expired" });
    const [userId, expiresAtRaw, nonce, signature] = parts;
    const payload = `${userId}.${expiresAtRaw}.${nonce}`;
    const expected = crypto.createHmac("sha256", env.sessionSecret).update(payload).digest("base64url");
    if (signature !== expected) throw authError("AEGIS verification has expired or is no longer valid. Start sign-in again to continue.", 401, "INVALID_MFA_CHALLENGE", { accessState: "verification_expired" });
    const expiresAt = Number(expiresAtRaw || 0);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw authError("AEGIS verification has expired or is no longer valid. Start sign-in again to continue.", 401, "INVALID_MFA_CHALLENGE", { accessState: "verification_expired" });
    const user = authUserRepository.findActiveById(userId);
    if (!user) throw authError("AEGIS verification has expired or is no longer valid. Start sign-in again to continue.", 401, "INVALID_MFA_CHALLENGE", { accessState: "verification_expired" });
    return user;
  }

  private verifySecondFactor(user: AppUser, code?: string | null) {
    const trimmed = String(code || "").trim();
    if (!trimmed) {
      throw authError("AEGIS verification code is required to continue secure access.", 401, "MISSING_MFA", { accessState: "verification_required" });
    }
    if (user.mfaSecret && mfaDomainService.verifyOtp(user.mfaSecret, trimmed)) return;
    throw authError("The AEGIS verification code could not be confirmed. Enter the current 6-digit authenticator code and try again.", 401, "INVALID_MFA", { accessState: "verification_failed" });
  }

  createUser(input: { email: string; fullName: string; role: AppUser["role"]; password: string; passwordChangeRequired?: boolean; tenantId?: string; trustIds?: string[]; activeTrustId?: string }): AppUser {
    const salt = crypto.randomBytes(16).toString("hex");
    const now = nowIso();
    const trustIds = normalizeTrustIds(input.trustIds || [input.activeTrustId || DEFAULT_TRUST_ID]);
    const activeTrustId = input.activeTrustId && trustIds.includes(input.activeTrustId) ? input.activeTrustId : (trustIds[0] || DEFAULT_TRUST_ID);
    return {
      id: crypto.randomUUID(),
      tenantId: input.tenantId || DEFAULT_TENANT_ID,
      trustIds: trustIds.length ? trustIds : [DEFAULT_TRUST_ID],
      activeTrustId,
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      role: input.role,
      passwordSalt: salt,
      passwordHash: hashPassword(input.password, salt),
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      passwordChangeRequired: input.passwordChangeRequired ?? true,
      sessionVersion: 1,
      passwordChangedAt: null,
      failedLoginCount: 0,
      lockedUntil: null,
      lockoutCount: 0,
      disabledAt: null,
      disabledReason: null,
      mfaEnabled: false,
      mfaSecret: null,
      mfaPendingSecret: null,
      mfaRecoveryCodes: [],
      mfaPendingRecoveryCodes: [],
      mfaEnrolledAt: null,
      lastLoginIp: null,
      lastLoginUserAgent: null,
    };
  }

  hasUsers(): boolean {
    return authUserRepository.hasActiveUsers();
  }

  getBootstrapStatus() {
    return { needsBootstrap: !this.hasUsers(), userCount: authUserRepository.countActiveUsers() };
  }

  findLegacyDefaultCredentialUser(): AppUser | null {
    for (const user of authUserRepository.listAll()) {
      if (!user.isActive || user.deletedAt) continue;
      const emailMatches = AuthService.LEGACY_DEFAULT_ADMIN_ALIASES.includes(user.email.trim().toLowerCase());
      const passwordMatches = this.verifyPassword(user, AuthService.LEGACY_DEFAULT_ADMIN_PASSWORD);
      if (emailMatches && passwordMatches) return user;
    }
    return null;
  }

  assertSecureBootstrapConfiguration(): void {
    if (!env.isProduction) return;
    const legacyEnvEmail = (env.legacyAdminEmail || "").trim().toLowerCase();
    const legacyEnvPassword = env.legacyAdminPassword || "";
    const envDefaultsDetected = AuthService.LEGACY_DEFAULT_ADMIN_ALIASES.includes(legacyEnvEmail) || legacyEnvPassword === AuthService.LEGACY_DEFAULT_ADMIN_PASSWORD;
    if (envDefaultsDetected) throw new Error("Refusing startup in production because legacy default admin credentials were detected in environment variables.");
    const insecureUser = this.findLegacyDefaultCredentialUser();
    if (insecureUser) throw new Error(`Refusing startup in production because a user with legacy default admin credentials was detected (${insecureUser.email}).`);
  }

  revokeUserSessions(userId: string, options: { exceptSessionId?: string | null } = {}) {
    return authSessionRepository.revokeUserSessions(userId, options);
  }

  issueAccessToken(user: AppUser, sessionId: string | null = null): Promise<string> {
    return accessTokenService.issue({ ...user, sessionVersion: this.getUserSessionVersion(user) }, sessionId);
  }

  issueToken(user: AppUser, sessionId: string | null = null): Promise<string> {
    return this.issueAccessToken(user, sessionId);
  }

  verifyPassword(user: AppUser, password: string): boolean {
    return hashPassword(password, user.passwordSalt) === user.passwordHash;
  }

  private isRefreshSessionValid(session: RefreshSession, user: AppUser | null): boolean {
    if (!user || !user.isActive || user.deletedAt || user.disabledAt) return false;
    if (session.revokedAt) return false;
    if (new Date(session.expiresAt).getTime() <= Date.now()) return false;
    if ((session.sessionVersion || 1) !== this.getUserSessionVersion(user)) return false;
    return true;
  }

  async verifyToken(token?: string | null): Promise<AuthenticatedUser | null> {
    const verified = await accessTokenService.verifyAndDecode(token);
    if (!verified) return null;
    const { claims } = verified;
    const user = authUserRepository.findActiveEnabledById(claims.sub);
    if (!user) return null;
    if ((claims.sv || 0) !== this.getUserSessionVersion(user)) return null;
    const scopedUser = resolveUserTenant(user as any);
    if (claims.tid !== scopedUser.tenantId) return null;
    if (claims.trid !== scopedUser.activeTrustId) return null;
    if (JSON.stringify(normalizeTrustIds(claims.trids)) !== JSON.stringify(scopedUser.trustIds)) return null;
    if (claims.sid) {
      const session = this.getRefreshSessionById(claims.sid);
      if (!session || !this.isRefreshSessionValid(session, user)) return null;
    }
    return toAuthenticatedUser(user, claims.sid || null);
  }

  createRefreshSession(user: AppUser, metadata: { ip?: string | null; userAgent?: string | null } = {}) {
    return authSessionRepository.create(user, this.getUserSessionVersion(user), AuthService.MAX_CONCURRENT_SESSIONS, metadata);
  }

  verifyRefreshToken(refreshToken?: string | null, metadata: { ip?: string | null; userAgent?: string | null } = {}): RefreshSession | null {
    if (!refreshToken) return null;
    const session = authSessionRepository.verify(refreshToken);
    if (!session) return null;
    const user = authUserRepository.findActiveById(session.userId) || null;
    if (!this.isRefreshSessionValid(session, user)) {
      session.revokedAt = session.revokedAt || nowIso();
      return null;
    }
    authSessionRepository.markUsed(session, metadata);
    return session;
  }

  async rotateRefreshSession(refreshToken?: string | null, metadata: { ip?: string | null; userAgent?: string | null } = {}) {
    const session = this.verifyRefreshToken(refreshToken, metadata);
    if (!session) return null;
    const user = authUserRepository.findActiveById(session.userId);
    if (!user) return null;
    session.revokedAt = nowIso();
    const next = this.createRefreshSession(user, metadata);
    return { user, accessToken: await this.issueAccessToken(user, next.session.id), refreshToken: next.refreshToken, session: next.session };
  }

  revokeRefreshToken(refreshToken?: string | null, options: { sessionId?: string | null } = {}) {
    if (options.sessionId) return this.revokeSessionById(options.sessionId);
    const session = this.verifyRefreshToken(refreshToken);
    if (!session) return false;
    session.revokedAt = nowIso();
    return true;
  }

  listSessionsForUser(currentUser: AuthenticatedUser) {
    return authSessionRepository.listForUser(currentUser.id)
      .filter((session) => session.userId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((session) => ({
        id: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastUsedAt: session.lastUsedAt,
        revokedAt: session.revokedAt,
        createdByIp: session.createdByIp || null,
        createdByUserAgent: session.createdByUserAgent || null,
        lastUsedIp: session.lastUsedIp || null,
        lastUsedUserAgent: session.lastUsedUserAgent || null,
        current: currentUser.sessionId === session.id,
      }));
  }

  async revokeSession(currentUser: AuthenticatedUser, sessionId: string) {
    const session = authSessionRepository.getOwnedSession(currentUser.id, sessionId);
    if (!session) throw Object.assign(new Error("Session not found."), { statusCode: 404 });
    if (session.revokedAt) return { success: true, revokedSessionId: sessionId };
    this.revokeSessionById(session.id);
    authAuditWriter.writeSessionRevoked(currentUser, session.id, session.userId);
    await db.withPersistenceBoundary("auth-session-revoke", async () => undefined);
    return { success: true, revokedSessionId: sessionId, currentSessionRevoked: currentUser.sessionId === sessionId };
  }

  async revokeOtherSessions(currentUser: AuthenticatedUser) {
    const revoked = this.revokeUserSessions(currentUser.id, { exceptSessionId: currentUser.sessionId || null });
    authAuditWriter.writeOtherSessionsRevoked(currentUser, revoked);
    await db.withPersistenceBoundary("auth-other-sessions-revoke", async () => undefined);
    return { success: true, revokedCount: revoked };
  }

  async bootstrapAdmin(input: { email: string; fullName: string; password: string }, metadata: { ip?: string | null; userAgent?: string | null } = {}) {
    if (this.hasUsers()) throw Object.assign(new Error("Bootstrap is unavailable because an administrative user already exists."), { statusCode: 409 });
    this.validatePasswordPolicy(input.password, { email: input.email, fullName: input.fullName });
    const user = this.createUser({ email: input.email, fullName: input.fullName, role: "ADMIN", tenantId: DEFAULT_TENANT_ID, trustIds: [DEFAULT_TRUST_ID], activeTrustId: DEFAULT_TRUST_ID, password: input.password, passwordChangeRequired: false });
    authUserRepository.save(user, { prepend: true });
    user.lastLoginAt = nowIso();
    user.lastLoginIp = metadata.ip || null;
    user.lastLoginUserAgent = metadata.userAgent || null;
    const refresh = this.createRefreshSession(user, metadata);
    const accessToken = await this.issueAccessToken(user, refresh.session.id);
    authAuditWriter.writeBootstrapAdmin(user, metadata);
    await db.withPersistenceBoundary("auth-bootstrap-admin", async () => undefined);
    return { token: accessToken, refreshToken: refresh.refreshToken, session: refresh.session, user: toAuthenticatedUser(user, refresh.session.id), mustChangePassword: Boolean(user.passwordChangeRequired), bootstrapComplete: true };
  }

  async login(email: string, password: string, metadata: { ip?: string | null; userAgent?: string | null; mfaCode?: string | null } = {}) {
    if (!this.hasUsers()) throw authError("Secure bootstrap is required before AEGIS Governance can be accessed.", 409, "BOOTSTRAP_REQUIRED", { accessState: "bootstrap_required" });
    const normalizedEmail = email.trim().toLowerCase();
    const user = authUserRepository.findActiveByEmail(normalizedEmail) || null;
    if (user) this.assertLoginAllowed(user, metadata);
    if (!user || !this.verifyPassword(user, password)) {
      this.recordFailedAuth(user, metadata, "invalid-credentials");
      await db.withPersistenceBoundary("auth-login-failure", async () => undefined);
      throw authError("The email address or password could not be verified.", 401, "INVALID_CREDENTIALS", { accessState: "denied" });
    }

    const securitySettings = getSecuritySettings();
    const adminMfaRequired = user.role === "ADMIN" && securitySettings.requireAdminMfa !== false;
    if (adminMfaRequired && user.mfaEnabled && !user.mfaSecret) {
      user.mfaEnabled = false;
      user.mfaEnrolledAt = null;
      user.updatedAt = nowIso();
      this.auditAuthAlert(user, "mfa-reset-missing-secret", { ip: metadata.ip || null });
    }
    if (adminMfaRequired && user.mfaEnabled) {
      if (!metadata.mfaCode) {
        await db.withPersistenceBoundary("auth-login-mfa-challenge", async () => undefined);
        return {
          requiresMfa: true,
          challengeToken: this.buildMfaChallengeToken(user),
          challengeMethod: "totp",
          challengeExpiresInSeconds: 300,
          challengeUser: { email: user.email, fullName: user.fullName },
        };
      }
      try {
        this.verifySecondFactor(user, metadata.mfaCode || null);
      } catch (error: any) {
        this.recordFailedAuth(user, metadata, error.code === "INVALID_MFA" ? "invalid-mfa" : "missing-mfa");
        await db.withPersistenceBoundary("auth-login-mfa-failure", async () => undefined);
        throw error;
      }
    }

    const suspiciousIp = Boolean(user.lastLoginIp && metadata.ip && user.lastLoginIp !== metadata.ip);
    const suspiciousAgent = Boolean(user.lastLoginUserAgent && metadata.userAgent && user.lastLoginUserAgent !== metadata.userAgent);
    if (suspiciousIp || suspiciousAgent) this.auditAuthAlert(user, "new-auth-fingerprint", { priorIp: user.lastLoginIp || null, nextIp: metadata.ip || null, priorUserAgent: user.lastLoginUserAgent || null, nextUserAgent: metadata.userAgent || null });

    this.clearFailedAuth(user);
    user.lastLoginAt = nowIso();
    user.lastLoginIp = metadata.ip || null;
    user.lastLoginUserAgent = metadata.userAgent || null;
    const refresh = this.createRefreshSession(user, metadata);
    const accessToken = await this.issueAccessToken(user, refresh.session.id);
    authAuditWriter.writeLogin(user, refresh.session.id, metadata, { keyId: env.accessTokenSigningKeyId, signingAlgorithm: "Ed25519", signerIdentity: env.accessTokenSignerIdentity, signerVersion: env.accessTokenSignerVersion, mfaSatisfied: adminMfaRequired ? Boolean(user.mfaEnabled) : false });
    await db.withPersistenceBoundary("auth-login", async () => undefined);
    return { token: accessToken, refreshToken: refresh.refreshToken, session: refresh.session, user: toAuthenticatedUser(user, refresh.session.id), mustChangePassword: Boolean(user.passwordChangeRequired) };
  }

  async changePassword(currentUser: AuthenticatedUser, input: { currentPassword: string; newPassword: string }, metadata: { ip?: string | null; userAgent?: string | null } = {}) {
    const user = authUserRepository.findActiveById(currentUser.id);
    if (!user) throw authError("The requested account could not be located.", 404, "USER_NOT_FOUND");
    if (!this.verifyPassword(user, input.currentPassword)) throw Object.assign(new Error("Current password is incorrect."), { statusCode: 400 });
    this.validatePasswordPolicy(input.newPassword, { email: user.email, fullName: user.fullName });
    const salt = crypto.randomBytes(16).toString("hex");
    user.passwordSalt = salt;
    user.passwordHash = hashPassword(input.newPassword, salt);
    user.passwordChangeRequired = false;
    user.passwordChangedAt = nowIso();
    user.sessionVersion = this.getUserSessionVersion(user) + 1;
    user.updatedAt = nowIso();
    const revokedCount = this.revokeUserSessions(user.id);
    const refresh = this.createRefreshSession(user, metadata);
    const accessToken = await this.issueAccessToken(user, refresh.session.id);
    authAuditWriter.writePasswordChanged(user, revokedCount, refresh.session.id);
    await db.withPersistenceBoundary("auth-password-change", async () => undefined);
    return { success: true, user: toAuthenticatedUser(user, refresh.session.id), sessionsRevoked: revokedCount, token: accessToken, refreshToken: refresh.refreshToken, session: refresh.session };
  }

  async beginMfaSetup(currentUser: AuthenticatedUser) {
    const user = authUserRepository.findActiveById(currentUser.id);
    if (!user) throw authError("The requested account could not be located.", 404, "USER_NOT_FOUND");
    const secret = user.mfaPendingSecret || mfaDomainService.generateBase32Secret(32);
    const recoveryCodes = (user.mfaPendingRecoveryCodes && user.mfaPendingRecoveryCodes.length) ? user.mfaPendingRecoveryCodes : mfaDomainService.generateRecoveryCodes();
    user.mfaPendingSecret = secret;
    user.mfaPendingRecoveryCodes = recoveryCodes;
    user.updatedAt = nowIso();
    await db.withPersistenceBoundary("auth-mfa-setup-begin", async () => undefined);
    const issuer = encodeURIComponent("AEGIS Governance");
    const label = encodeURIComponent(user.email);
    return { otpauthUri: `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30` };
  }

  async enableMfa(currentUser: AuthenticatedUser, code: string) {
    const user = authUserRepository.findActiveById(currentUser.id);
    if (!user) throw authError("The requested account could not be located.", 404, "USER_NOT_FOUND");
    if (!user.mfaPendingSecret) throw authError("No AEGIS authenticator enrollment is pending for this account.", 400, "NO_MFA_SETUP_PENDING");
    if (!mfaDomainService.verifyOtp(user.mfaPendingSecret, code)) throw authError("The authenticator code could not be verified. Enter the current 6-digit code to complete enrollment.", 400, "INVALID_MFA_ENROLLMENT_CODE");
    user.mfaSecret = user.mfaPendingSecret;
    user.mfaRecoveryCodes = [...(user.mfaPendingRecoveryCodes || [])];
    user.mfaPendingSecret = null;
    user.mfaPendingRecoveryCodes = [];
    user.mfaEnabled = true;
    user.mfaEnrolledAt = nowIso();
    user.updatedAt = nowIso();
    authAuditWriter.writeMfaEnabled(user);
    await db.withPersistenceBoundary("auth-mfa-enable", async () => undefined);
    return { success: true, user: toAuthenticatedUser(user, currentUser.sessionId || null) };
  }

  async verifyMfaChallenge(challengeToken: string, code: string, metadata: { ip?: string | null; userAgent?: string | null } = {}) {
    const user = this.verifyMfaChallengeToken(challengeToken);
    this.assertLoginAllowed(user, metadata);
    try {
      this.verifySecondFactor(user, code || null);
    } catch (error: any) {
      this.recordFailedAuth(user, metadata, error.code === "INVALID_MFA" ? "invalid-mfa" : "missing-mfa");
      await db.withPersistenceBoundary("auth-login-mfa-failure", async () => undefined);
      throw error;
    }
    this.clearFailedAuth(user);
    user.lastLoginAt = nowIso();
    user.lastLoginIp = metadata.ip || null;
    user.lastLoginUserAgent = metadata.userAgent || null;
    const refresh = this.createRefreshSession(user, metadata);
    const accessToken = await this.issueAccessToken(user, refresh.session.id);
    authAuditWriter.writeLogin(user, refresh.session.id, metadata, { keyId: env.accessTokenSigningKeyId, signingAlgorithm: "Ed25519", signerIdentity: env.accessTokenSignerIdentity, signerVersion: env.accessTokenSignerVersion, mfaSatisfied: true });
    await db.withPersistenceBoundary("auth-login-mfa-verify", async () => undefined);
    return { token: accessToken, refreshToken: refresh.refreshToken, session: refresh.session, user: toAuthenticatedUser(user, refresh.session.id), mustChangePassword: Boolean(user.passwordChangeRequired) };
  }

  listUsers() {
    return authUserRepository.listAll().map(sanitizeUser);
  }

  async register(_input: { email: string; fullName: string; password: string }) {
    throw authError("Self-service enrollment is disabled. Contact an administrator for access provisioning.", 403, "SELF_REGISTRATION_DISABLED");
  }

  async createManagedUser(input: { email: string; fullName: string; role: AppUser["role"]; password: string; tenantId?: string; trustIds?: string[]; activeTrustId?: string }) {
    const email = input.email.trim().toLowerCase();
    if (authUserRepository.emailExists(email)) throw authError("An account with that email address already exists.", 409, "EMAIL_ALREADY_EXISTS");
    this.validatePasswordPolicy(input.password, { email, fullName: input.fullName });
    const user = this.createUser({ ...input, email, passwordChangeRequired: true });
    authUserRepository.save(user);
    authAuditWriter.writeUserCreated(user, email);
    await db.withPersistenceBoundary("auth-user-create", async () => undefined);
    return { user: sanitizeUser(user) };
  }
}

export const authService = new AuthService();
