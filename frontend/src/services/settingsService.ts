import type { GovernanceSettings } from "../models/types";
import { apiClient } from "./apiClient";

export const settingsService = {
  async getSettings() {
    const response = await apiClient.get<{ values: GovernanceSettings }>("/settings");
    return response.values;
  },

  async saveSettings(nextSettings: GovernanceSettings) {
    const response = await apiClient.put<{ values: GovernanceSettings }>("/settings", nextSettings);
    return response.values;
  },
};
