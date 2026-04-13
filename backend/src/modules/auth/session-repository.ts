import type { RefreshSession, AppUser } from "../../models/domain.js";
import { db } from "../../store/governance-store.js";
import { nowIso, futureIso, sha256 } from "./crypto-helpers.js";
import crypto from "node:crypto";
import { env } from "../../config/env.js";

export class AuthSessionRepository {
  listAll(): RefreshSession[] { return db.sessions; }
  listForUser(userId: string): RefreshSession[] { return db.sessions.filter((item) => item.userId === userId); }
  getById(sessionId?: string | null): RefreshSession | null {
    if (!sessionId) return null;
    return db.sessions.find((item) => item.id === sessionId) || null;
  }
  markUsed(session: RefreshSession, metadata: { ip?: string | null; userAgent?: string | null } = {}) {
    session.lastUsedAt = nowIso();
    if (metadata.ip !== undefined) session.lastUsedIp = metadata.ip || null;
    if (metadata.userAgent !== undefined) session.lastUsedUserAgent = metadata.userAgent || null;
  }
  revokeById(sessionId?: string | null) {
    const session = this.getById(sessionId);
    if (!session || session.revokedAt) return false;
    session.revokedAt = nowIso();
    return true;
  }
  create(user: AppUser, sessionVersion: number, maxConcurrentSessions: number, metadata: { ip?: string | null; userAgent?: string | null } = {}) {
    const rawToken = crypto.randomBytes(48).toString("base64url");
    const session: RefreshSession = {
      id: crypto.randomUUID(), userId: user.id, tokenHash: sha256(rawToken), createdAt: nowIso(), expiresAt: futureIso(env.refreshTokenTtlSeconds),
      lastUsedAt: null, revokedAt: null, createdByIp: metadata.ip || null, createdByUserAgent: metadata.userAgent || null,
      lastUsedIp: metadata.ip || null, lastUsedUserAgent: metadata.userAgent || null, sessionVersion,
    };
    const currentSessions = db.sessions.filter((item) => item.userId === user.id && !item.revokedAt).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    for (const stale of currentSessions.slice(maxConcurrentSessions - 1)) stale.revokedAt = nowIso();
    db.sessions = [session, ...db.sessions];
    return { refreshToken: rawToken, session };
  }
  verify(refreshToken?: string | null): RefreshSession | null {
    if (!refreshToken) return null;
    return db.sessions.find((item) => item.tokenHash === sha256(refreshToken) && !item.revokedAt) || null;
  }
  getOwnedSession(userId: string, sessionId: string) {
    return db.sessions.find((item) => item.id === sessionId && item.userId === userId) || null;
  }
  revokeUserSessions(userId: string, options: { exceptSessionId?: string | null } = {}) {
    let revoked = 0;
    for (const session of db.sessions) {
      if (session.userId !== userId || session.revokedAt) continue;
      if (options.exceptSessionId && session.id === options.exceptSessionId) continue;
      session.revokedAt = nowIso(); revoked += 1;
    }
    return revoked;
  }
}
export const authSessionRepository = new AuthSessionRepository();
