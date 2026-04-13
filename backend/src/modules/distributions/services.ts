import type { DistributionRepository } from "./repositories.js";

export class DistributionModuleService {
  constructor(private readonly repository: DistributionRepository) {}

  requestDistribution(...args: Parameters<DistributionRepository["requestDistribution"]>) { return this.repository.requestDistribution(...args); }
  approveDistribution(...args: Parameters<DistributionRepository["approveDistribution"]>) { return this.repository.approveDistribution(...args); }
}
