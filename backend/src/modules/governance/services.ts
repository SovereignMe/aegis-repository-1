import type { GovernanceRepository } from "./repositories.js";

export class GovernanceModuleService {
  constructor(private readonly repository: GovernanceRepository) {}

  getOverview(...args: Parameters<GovernanceRepository["getOverview"]>) { return this.repository.getOverview(...args); }
  listArtifacts(...args: Parameters<GovernanceRepository["listArtifacts"]>) { return this.repository.listArtifacts(...args); }
  getWorkspacePage(...args: Parameters<GovernanceRepository["getWorkspacePage"]>) { return this.repository.getWorkspacePage(...args); }
  getAdministrativeRecordsPage(...args: Parameters<GovernanceRepository["getAdministrativeRecordsPage"]>) { return this.repository.getAdministrativeRecordsPage(...args); }
  getNoticesPage(...args: Parameters<GovernanceRepository["getNoticesPage"]>) { return this.repository.getNoticesPage(...args); }
  getBeneficiariesPage(...args: Parameters<GovernanceRepository["getBeneficiariesPage"]>) { return this.repository.getBeneficiariesPage(...args); }
  getLedgersPage(...args: Parameters<GovernanceRepository["getLedgersPage"]>) { return this.repository.getLedgersPage(...args); }
  getPacketsPage(...args: Parameters<GovernanceRepository["getPacketsPage"]>) { return this.repository.getPacketsPage(...args); }
  getApprovalsPage(...args: Parameters<GovernanceRepository["getApprovalsPage"]>) { return this.repository.getApprovalsPage(...args); }
  getPoliciesPage(...args: Parameters<GovernanceRepository["getPoliciesPage"]>) { return this.repository.getPoliciesPage(...args); }
  getVerificationPage(...args: Parameters<GovernanceRepository["getVerificationPage"]>) { return this.repository.getVerificationPage(...args); }
  createBeneficiary(...args: Parameters<GovernanceRepository["createBeneficiary"]>) { return this.repository.createBeneficiary(...args); }
  buildPacket(...args: Parameters<GovernanceRepository["buildPacket"]>) { return this.repository.buildPacket(...args); }
  approvePacket(...args: Parameters<GovernanceRepository["approvePacket"]>) { return this.repository.approvePacket(...args); }
  listPolicyVersions(...args: Parameters<GovernanceRepository["listPolicyVersions"]>) { return this.repository.listPolicyVersions(...args); }
  createPolicyVersion(...args: Parameters<GovernanceRepository["createPolicyVersion"]>) { return this.repository.createPolicyVersion(...args); }
  activatePolicyVersion(...args: Parameters<GovernanceRepository["activatePolicyVersion"]>) { return this.repository.activatePolicyVersion(...args); }
  getPacketManifestSummary(...args: Parameters<GovernanceRepository["getPacketManifestSummary"]>) { return this.repository.getPacketManifestSummary(...args); }
  getPacketBundle(...args: Parameters<GovernanceRepository["getPacketBundle"]>) { return this.repository.getPacketBundle(...args); }
  getPacketArtifactStatus(...args: Parameters<GovernanceRepository["getPacketArtifactStatus"]>) { return this.repository.getPacketArtifactStatus(...args); }
}
