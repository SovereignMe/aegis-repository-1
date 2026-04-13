import { DistributionModuleService } from "./services.js";
import { distributionRepository } from "./repositories.js";

const distributionModuleService = new DistributionModuleService(distributionRepository);

export interface DistributionServicePort {
  requestDistribution: DistributionModuleService["requestDistribution"];
  approveDistribution: DistributionModuleService["approveDistribution"];
}

export const distributionModuleServices: { distributions: DistributionServicePort } = {
  distributions: distributionModuleService,
};
