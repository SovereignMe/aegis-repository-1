import type { AppRole, PermissionMatrix } from "../models/types";
import { apiClient } from "./apiClient";

export const controlService = {
  async getRole() {
    return apiClient.get<{ role: AppRole }>("/controls/role");
  },

  async getPermissions() {
    return apiClient.get<{ permissions: PermissionMatrix }>("/controls/permissions");
  },

  async savePermissions(permissions: PermissionMatrix) {
    return apiClient.put<{ permissions: PermissionMatrix }>("/controls/permissions", { permissions });
  },
};
