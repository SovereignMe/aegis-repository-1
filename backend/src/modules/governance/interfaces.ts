import { GovernanceModuleService } from "./services.js";
import { governanceRepository } from "./repositories.js";

const governanceModuleService = new GovernanceModuleService(governanceRepository);

export interface GovernanceServicePort {
  getOverview: GovernanceModuleService["getOverview"];
  listArtifacts: GovernanceModuleService["listArtifacts"];
  getWorkspacePage: GovernanceModuleService["getWorkspacePage"];
  getAdministrativeRecordsPage: GovernanceModuleService["getAdministrativeRecordsPage"];
  getNoticesPage: GovernanceModuleService["getNoticesPage"];
  getBeneficiariesPage: GovernanceModuleService["getBeneficiariesPage"];
  getLedgersPage: GovernanceModuleService["getLedgersPage"];
  getPacketsPage: GovernanceModuleService["getPacketsPage"];
  getApprovalsPage: GovernanceModuleService["getApprovalsPage"];
  getPoliciesPage: GovernanceModuleService["getPoliciesPage"];
  getVerificationPage: GovernanceModuleService["getVerificationPage"];
  createBeneficiary: GovernanceModuleService["createBeneficiary"];
  buildPacket: GovernanceModuleService["buildPacket"];
  approvePacket: GovernanceModuleService["approvePacket"];
  listPolicyVersions: GovernanceModuleService["listPolicyVersions"];
  createPolicyVersion: GovernanceModuleService["createPolicyVersion"];
  activatePolicyVersion: GovernanceModuleService["activatePolicyVersion"];
  getPacketManifestSummary: GovernanceModuleService["getPacketManifestSummary"];
  getPacketBundle: GovernanceModuleService["getPacketBundle"];
  getPacketArtifactStatus: GovernanceModuleService["getPacketArtifactStatus"];
}

export const governanceModuleServices: { governance: GovernanceServicePort } = {
  governance: governanceModuleService,
};
