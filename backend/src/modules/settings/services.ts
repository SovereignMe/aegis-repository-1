import type { SettingsRepository } from "./repositories.js";

export class SettingsModuleService {
  constructor(private readonly repository: SettingsRepository) {}

  getEffectiveSettings(...args: Parameters<SettingsRepository["getEffectiveSettings"]>) { return this.repository.getEffectiveSettings(...args); }
  updateSettings(...args: Parameters<SettingsRepository["updateSettings"]>) { return this.repository.updateSettings(...args); }
}
