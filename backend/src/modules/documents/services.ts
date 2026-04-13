import type { DocumentRepository } from "./repositories.js";

export class DocumentsModuleService {
  constructor(private readonly repository: DocumentRepository) {}

  listDocuments(...args: Parameters<DocumentRepository["listDocuments"]>) { return this.repository.listDocuments(...args); }
  createDocument(...args: Parameters<DocumentRepository["createDocument"]>) { return this.repository.createDocument(...args); }
  createUploadedDocument(...args: Parameters<DocumentRepository["createUploadedDocument"]>) { return this.repository.createUploadedDocument(...args); }
  findDocument(...args: Parameters<DocumentRepository["findDocument"]>) { return this.repository.findDocument(...args); }
  getVerificationSummary(...args: Parameters<DocumentRepository["getVerificationSummary"]>) { return this.repository.getVerificationSummary(...args); }
  getVerificationReport(...args: Parameters<DocumentRepository["getVerificationReport"]>) { return this.repository.getVerificationReport(...args); }
  archiveDocument(...args: Parameters<DocumentRepository["archiveDocument"]>) { return this.repository.archiveDocument(...args); }
}
