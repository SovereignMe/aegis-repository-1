import { RepositoryModuleService } from "./services.js";
import { repositoryRecordRepository } from "./repositories.js";

const repositoryModuleService = new RepositoryModuleService(repositoryRecordRepository);

export interface RepositoryServicePort {
  findDocument: RepositoryModuleService["findDocument"];
  getVerificationSummary: RepositoryModuleService["getVerificationSummary"];
}

export const repositoryModuleServices: { repository: RepositoryServicePort } = {
  repository: repositoryModuleService,
};
