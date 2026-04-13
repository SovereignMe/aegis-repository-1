import type { RequestContext } from "../../models/domain.js";
import { assertAuthorized, getActor } from "../../services/authorization.service.js";
import { db } from "../../store/governance-store.js";

export class SettingsRepository {
  async getEffectiveSettings(context?: RequestContext, scopeType = "tenant", scopeId?: string) {
    const tenantId = context?.user.tenantId || scopeId || null;
    return { scopeType, scopeId: tenantId, values: db.settings };
  }

  async updateSettings(context: RequestContext, values: Record<string, unknown>, scopeType = "tenant", scopeId?: string) {
    assertAuthorized(context, "settings.write", "Updating settings");
    const before = structuredClone(db.settings);
    db.settings = structuredClone(values);
    db.addAudit("SETTINGS_UPDATED", "settings", "app-settings", before, db.settings as Record<string, unknown>, { scopeType, scopeId: scopeId || context.user.tenantId || null, tenantId: context.user.tenantId, trustId: context.user.activeTrustId }, getActor(context));
    await db.persist("settings-updated");
    return { scopeType, scopeId: scopeId || null, values: db.settings };
  }
}

export const settingsRepository = new SettingsRepository();
