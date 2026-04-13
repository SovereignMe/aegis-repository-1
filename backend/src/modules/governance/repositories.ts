import { governanceService } from "./native-governance.js";
import { governanceQueryRepository } from "./governance-query-repository.js";
import { beneficiaryPolicyService } from "./beneficiary-policy-service.js";

export class GovernanceRepository {
  getOverview = governanceService.getOverview.bind(governanceService);
  listArtifacts = governanceQueryRepository.listArtifacts.bind(governanceQueryRepository);
  getWorkspacePage = governanceQueryRepository.getWorkspacePage.bind(governanceQueryRepository);
  getAdministrativeRecordsPage = governanceQueryRepository.getAdministrativeRecordsPage.bind(governanceQueryRepository);
  getNoticesPage = governanceQueryRepository.getNoticesPage.bind(governanceQueryRepository);
  getBeneficiariesPage = governanceQueryRepository.getBeneficiariesPage.bind(governanceQueryRepository);
  getLedgersPage = governanceQueryRepository.getLedgersPage.bind(governanceQueryRepository);
  getPacketsPage = governanceQueryRepository.getPacketsPage.bind(governanceQueryRepository);
  getApprovalsPage = governanceQueryRepository.getApprovalsPage.bind(governanceQueryRepository);
  getPoliciesPage = governanceQueryRepository.getPoliciesPage.bind(governanceQueryRepository);
  getVerificationPage = governanceQueryRepository.getVerificationPage.bind(governanceQueryRepository);
  createBeneficiary = beneficiaryPolicyService.createBeneficiary.bind(beneficiaryPolicyService);
  buildPacket = governanceService.buildPacket.bind(governanceService);
  approvePacket = governanceService.approvePacket.bind(governanceService);
  listPolicyVersions = governanceService.listPolicyVersions.bind(governanceService);
  createPolicyVersion = governanceService.createPolicyVersion.bind(governanceService);
  activatePolicyVersion = governanceService.activatePolicyVersion.bind(governanceService);
  getPacketManifestSummary = governanceService.getPacketManifestSummary.bind(governanceService);
  getPacketBundle = governanceService.getPacketBundle.bind(governanceService);
  getPacketArtifactStatus = governanceService.getPacketArtifactStatus.bind(governanceService);
}

export const governanceRepository = new GovernanceRepository();
