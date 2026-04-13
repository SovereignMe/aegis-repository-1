import type { RepositoryRecordRepository } from "./repositories.js";

export class RepositoryModuleService {
  constructor(private readonly repository: RepositoryRecordRepository) {}

  findDocument(...args: Parameters<RepositoryRecordRepository["findDocument"]>) { return this.repository.findDocument(...args); }
  getVerificationSummary(...args: Parameters<RepositoryRecordRepository["getVerificationSummary"]>) { return this.repository.getVerificationSummary(...args); }
}
