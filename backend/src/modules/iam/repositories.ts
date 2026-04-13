import crypto from "node:crypto";
import type { AppUser } from "../../models/domain.js";
import { db } from "../../store/governance-store.js";
import { DEFAULT_TENANT_ID, DEFAULT_TRUST_ID, normalizeTrustIds } from "../../services/tenancy.service.js";

function nowIso() { return new Date().toISOString(); }
function hashPassword(password: string, salt: string): string { return crypto.scryptSync(password, salt, 64).toString("hex"); }
function sanitizeUser(user: AppUser) {
  return { id: user.id, tenantId: user.tenantId || DEFAULT_TENANT_ID, trustIds: normalizeTrustIds(user.trustIds || [user.activeTrustId || DEFAULT_TRUST_ID]), activeTrustId: user.activeTrustId || DEFAULT_TRUST_ID, email: user.email, fullName: user.fullName, role: user.role, isActive: user.isActive, createdAt: user.createdAt, updatedAt: user.updatedAt, lastLoginAt: user.lastLoginAt || null, passwordChangeRequired: Boolean(user.passwordChangeRequired), sessionVersion: user.sessionVersion || 1, passwordChangedAt: user.passwordChangedAt || null, failedLoginCount: user.failedLoginCount || 0, lockedUntil: user.lockedUntil || null, lockoutCount: user.lockoutCount || 0, disabledAt: user.disabledAt || null, disabledReason: user.disabledReason || null, mfaEnabled: Boolean(user.mfaEnabled), mfaEnrolledAt: user.mfaEnrolledAt || null };
}
function createUser(input: { email: string; fullName: string; role: AppUser["role"]; password: string; passwordChangeRequired?: boolean; tenantId?: string; trustIds?: string[]; activeTrustId?: string }): AppUser {
  const salt = crypto.randomBytes(16).toString("hex"); const now = nowIso(); const trustIds = normalizeTrustIds(input.trustIds || [input.activeTrustId || DEFAULT_TRUST_ID]);
  const activeTrustId = input.activeTrustId && trustIds.includes(input.activeTrustId) ? input.activeTrustId : (trustIds[0] || DEFAULT_TRUST_ID);
  return { id: crypto.randomUUID(), tenantId: input.tenantId || DEFAULT_TENANT_ID, trustIds: trustIds.length ? trustIds : [DEFAULT_TRUST_ID], activeTrustId, email: input.email.trim().toLowerCase(), fullName: input.fullName.trim(), role: input.role, passwordSalt: salt, passwordHash: hashPassword(input.password, salt), isActive: true, createdAt: now, updatedAt: now, lastLoginAt: null, passwordChangeRequired: input.passwordChangeRequired ?? true, sessionVersion: 1, passwordChangedAt: null, failedLoginCount: 0, lockedUntil: null, lockoutCount: 0, disabledAt: null, disabledReason: null, mfaEnabled: false, mfaSecret: null, mfaPendingSecret: null, mfaRecoveryCodes: [], mfaPendingRecoveryCodes: [], mfaEnrolledAt: null, lastLoginIp: null, lastLoginUserAgent: null };
}

export class IamRepository {
  listUsers() { return db.users.map(sanitizeUser); }
  async createManagedUser(input: { email: string; fullName: string; role: AppUser["role"]; password: string; tenantId?: string; trustIds?: string[]; activeTrustId?: string }) {
    const email = input.email.trim().toLowerCase();
    if (db.users.some((user) => user.email === email && user.isActive && !user.deletedAt)) throw Object.assign(new Error("A user with that email already exists."), { statusCode: 409 });
    const user = createUser({ ...input, email, passwordChangeRequired: true });
    db.users.push(user); db.addAudit("AUTH_USER_CREATED", "user", user.id, null, { email: user.email, role: user.role }, undefined, `USER:${email}`); await db.persist("auth-user-create");
    return { user: sanitizeUser(user) };
  }
  getPermissionsMatrix() { return db.permissions; }
  setPermissionsMatrix(next: typeof db.permissions) { db.permissions = next; }
  addAudit = db.addAudit.bind(db);
  persist = db.persist.bind(db);
}

export const iamRepository = new IamRepository();
