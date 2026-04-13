import type { GovernanceArtifacts, GovernanceOverview, GovernancePolicyState, GovernanceWorkspacePagePayload } from "../models/types";
import type { ArtifactStatusSummary, GovernanceMutationResponse } from "@trust-governance/shared/contracts";
import { apiClient } from "./apiClient";

export const governanceService = {
  getPacketArtifactStatus,
  getOverview() {
    return apiClient.get<GovernanceOverview>("/governance/overview");
  },
  listArtifacts() {
    return apiClient.get<GovernanceArtifacts>("/governance/artifacts");
  },
  getWorkspacePage(page: string) {
    return apiClient.get<GovernanceWorkspacePagePayload>(`/governance/pages/${page}`);
  },
  createBeneficiary(payload: Record<string, any>) {
    return apiClient.post<GovernanceMutationResponse>("/governance/beneficiaries", payload);
  },
  requestDistribution(payload: Record<string, any>) {
    return apiClient.post<GovernanceMutationResponse>("/governance/distributions", payload);
  },
  approveDistribution(id: string, payload: Record<string, any>) {
    return apiClient.patch<GovernanceMutationResponse>(`/governance/distributions/${id}/approve`, payload);
  },
  createNotice(payload: Record<string, any>) {
    return apiClient.post<GovernanceMutationResponse>("/governance/notices", payload);
  },
  serveNotice(id: string, payload: Record<string, any> = {}) {
    return apiClient.patch<GovernanceMutationResponse>(`/governance/notices/${id}/serve`, payload);
  },
  buildPacket(payload: Record<string, any>) {
    return apiClient.post<GovernanceMutationResponse>("/governance/packets", payload);
  },
  approvePacket(id: string, payload: Record<string, any>) {
    return apiClient.patch<GovernanceMutationResponse>(`/governance/packets/${id}/approve`, payload);
  },
  getPacketManifest(id: string) {
    return apiClient.get<Record<string, any>>(`/governance/packets/${id}/manifest`);
  },
  listPolicies() {
    return apiClient.get<GovernancePolicyState>("/governance/policies");
  },
  createPolicyVersion(payload: Record<string, any>) {
    return apiClient.post<Record<string, any>>("/governance/policies", payload);
  },
  activatePolicyVersion(policyType: string, versionId: string) {
    return apiClient.patch<GovernancePolicyState>(`/governance/policies/${policyType}/versions/${versionId}/activate`, {});
  },
};


function getPacketArtifactStatus(packetId: string) {
  return apiClient.get<ArtifactStatusSummary>(`/governance/packets/${packetId}/artifact-status`);
}
