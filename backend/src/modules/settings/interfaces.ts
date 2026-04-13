import { SettingsModuleService } from "./services.js";
import { settingsRepository } from "./repositories.js";

const settingsModuleService = new SettingsModuleService(settingsRepository);

export interface SettingsServicePort {
  getEffectiveSettings: SettingsModuleService["getEffectiveSettings"];
  updateSettings: SettingsModuleService["updateSettings"];
}

export const settingsModuleServices: { settings: SettingsServicePort } = {
  settings: settingsModuleService,
};
