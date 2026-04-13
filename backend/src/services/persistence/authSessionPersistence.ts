import type { Pool, PoolClient } from "pg";
import type { AppUser, RefreshSession } from "../../models/domain.js";

export async function loadAuthSessionState(pool: Pool): Promise<{ users: AppUser[]; sessions: RefreshSession[] }> {
  const userRows = await pool.query(`SELECT u.id, u.tenant_id AS "tenantId", u.active_trust_id AS "activeTrustId", COALESCE(memberships.trust_ids, ARRAY[]::text[]) AS "trustIds", u.email, u.full_name AS "fullName", u.role, u.password_hash AS "passwordHash", u.password_salt AS "passwordSalt", u.is_active AS "isActive", u.created_at AS "createdAt", u.updated_at AS "updatedAt", u.last_login_at AS "lastLoginAt", u.password_change_required AS "passwordChangeRequired", u.session_version AS "sessionVersion", u.password_changed_at AS "passwordChangedAt", u.immutable, u.deleted_at AS "deletedAt" FROM users u LEFT JOIN (SELECT user_id, ARRAY_AGG(trust_id ORDER BY created_at, trust_id) AS trust_ids FROM user_trust_memberships GROUP BY user_id) memberships ON memberships.user_id = u.id ORDER BY u.created_at ASC`);
  const sessionRows = await pool.query(`SELECT id, user_id AS "userId", token_hash AS "tokenHash", created_at AS "createdAt", expires_at AS "expiresAt", last_used_at AS "lastUsedAt", revoked_at AS "revokedAt", created_by_ip AS "createdByIp", created_by_user_agent AS "createdByUserAgent", last_used_ip AS "lastUsedIp", last_used_user_agent AS "lastUsedUserAgent", session_version AS "sessionVersion" FROM refresh_sessions ORDER BY created_at DESC`);
  return { users: userRows.rows, sessions: sessionRows.rows };
}

export async function persistAuthSessionState(
  client: PoolClient,
  state: { users: AppUser[]; sessions?: RefreshSession[] },
  resolveTenantIdForTrust: (trustId?: string | null) => string,
  fallbackTrustId: string,
) {
  await client.query(`DELETE FROM user_trust_memberships`);

  const userIds = state.users.map((item) => item.id);
  if (userIds.length) await client.query(`DELETE FROM users WHERE NOT (id = ANY($1::uuid[]))`, [userIds]);
  else await client.query(`DELETE FROM users`);

  for (const user of state.users) {
    const userTrustIds = Array.isArray(user.trustIds) && user.trustIds.length ? user.trustIds : [user.activeTrustId || fallbackTrustId];
    const activeTrustId = user.activeTrustId && userTrustIds.includes(user.activeTrustId) ? user.activeTrustId : userTrustIds[0];
    const tenantId = user.tenantId || resolveTenantIdForTrust(activeTrustId);
    await client.query(`INSERT INTO users (id, tenant_id, active_trust_id, email, full_name, role, password_hash, password_salt, is_active, created_at, updated_at, last_login_at, password_change_required, session_version, password_changed_at, immutable, deleted_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id, active_trust_id = EXCLUDED.active_trust_id, email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash, password_salt = EXCLUDED.password_salt, is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at, last_login_at = EXCLUDED.last_login_at, password_change_required = EXCLUDED.password_change_required, session_version = EXCLUDED.session_version, password_changed_at = EXCLUDED.password_changed_at, immutable = EXCLUDED.immutable, deleted_at = EXCLUDED.deleted_at`, [user.id, tenantId, activeTrustId || fallbackTrustId, user.email, user.fullName, user.role, user.passwordHash, user.passwordSalt, user.isActive, user.createdAt, user.updatedAt, user.lastLoginAt || null, Boolean(user.passwordChangeRequired), user.sessionVersion || 1, user.passwordChangedAt || null, Boolean(user.immutable), user.deletedAt || null]);
    for (const trustId of userTrustIds) {
      await client.query(`INSERT INTO user_trust_memberships (user_id, tenant_id, trust_id) VALUES ($1,$2,$3) ON CONFLICT (user_id, trust_id) DO NOTHING`, [user.id, resolveTenantIdForTrust(trustId), trustId]);
    }
  }

  const sessionIds = state.sessions?.map((item) => item.id) || [];
  if (sessionIds.length) await client.query(`DELETE FROM refresh_sessions WHERE NOT (id = ANY($1::uuid[]))`, [sessionIds]);
  else await client.query(`DELETE FROM refresh_sessions`);

  for (const session of state.sessions || []) {
    await client.query(`INSERT INTO refresh_sessions (id, user_id, token_hash, created_at, expires_at, last_used_at, revoked_at, created_by_ip, created_by_user_agent, last_used_ip, last_used_user_agent, session_version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at, last_used_at = EXCLUDED.last_used_at, revoked_at = EXCLUDED.revoked_at, created_by_ip = EXCLUDED.created_by_ip, created_by_user_agent = EXCLUDED.created_by_user_agent, last_used_ip = EXCLUDED.last_used_ip, last_used_user_agent = EXCLUDED.last_used_user_agent, session_version = EXCLUDED.session_version`, [session.id, session.userId, session.tokenHash, session.createdAt, session.expiresAt, session.lastUsedAt || null, session.revokedAt || null, session.createdByIp || null, session.createdByUserAgent || null, session.lastUsedIp || null, session.lastUsedUserAgent || null, session.sessionVersion || 1]);
  }
}
