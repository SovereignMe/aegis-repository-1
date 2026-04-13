import { apiClient } from "./apiClient";

export const integrationService = {
  async listIntegrations() {
    return apiClient.get<Record<string, any>[]>("/integrations");
  },

  async markSync(providerId: string) {
    return apiClient.patch<Record<string, any>>(`/integrations/${providerId}/sync`, {});
  },
};
