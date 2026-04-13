import type { AuthenticatedUser, RequestContext } from "../models/domain.js";

export const DEFAULT_TENANT_ID = "hlh-tenant";
export const DEFAULT_TRUST_ID = "local-trust";

export function normalizeTrustIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map((item) => String(item || "").trim()).filter(Boolean))];
}

export function resolveUserTenant(user: Partial<AuthenticatedUser> & { tenantId?: string; trustIds?: string[]; activeTrustId?: string | null }) {
  const tenantId = String(user.tenantId || DEFAULT_TENANT_ID);
  const trustIds = normalizeTrustIds(user.trustIds || [user.activeTrustId || DEFAULT_TRUST_ID]);
  const activeTrustId = String((user.activeTrustId && trustIds.includes(user.activeTrustId) ? user.activeTrustId : trustIds[0]) || DEFAULT_TRUST_ID);
  return { tenantId, trustIds: trustIds.length ? trustIds : [DEFAULT_TRUST_ID], activeTrustId };
}

export function getTenantScope(context: RequestContext) {
  return resolveUserTenant(context.user);
}

export function resolveTrustId(context: RequestContext, requestedTrustId?: string | null) {
  const { tenantId, trustIds, activeTrustId } = resolveUserTenant(context.user);
  const nextTrustId = requestedTrustId ? String(requestedTrustId) : activeTrustId;
  if (!trustIds.includes(nextTrustId)) {
    const error = new Error(`Trust access denied for ${nextTrustId}.`) as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }
  return { tenantId, trustId: nextTrustId, trustIds };
}

export function scopeCollectionByTrust(items: any[] | undefined | null, trustId: string) {
  return (items || []).filter((item) => !item?.deletedAt && (!("trustId" in (item || {})) || item.trustId === trustId));
}

export function matchesScopedRecord(item: any, trustId: string) {
  return Boolean(item && !item.deletedAt && (!("trustId" in item) || item.trustId === trustId));
}
