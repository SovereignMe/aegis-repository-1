import { apiClient } from "./apiClient";

export const diagnosticsService = {
  getHealth: () => apiClient.get<Record<string, any>>("/health"),
  getReadiness: () => apiClient.get<Record<string, any>>("/ready"),
  getMetrics: () => apiClient.get<Record<string, any>>("/metrics"),
  getDiagnostics: () => apiClient.get<Record<string, any>>("/admin/diagnostics"),
  verifyBackups: () => apiClient.post<Record<string, any>>("/admin/diagnostics/backups/verify"),
};
