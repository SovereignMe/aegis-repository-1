import { DocumentsModuleService } from "./services.js";
import { documentRepository } from "./repositories.js";

const documentsModuleService = new DocumentsModuleService(documentRepository);

export interface DocumentServicePort {
  listDocuments: DocumentsModuleService["listDocuments"];
  createDocument: DocumentsModuleService["createDocument"];
  createUploadedDocument: DocumentsModuleService["createUploadedDocument"];
  findDocument: DocumentsModuleService["findDocument"];
  getVerificationSummary: DocumentsModuleService["getVerificationSummary"];
  getVerificationReport: DocumentsModuleService["getVerificationReport"];
  archiveDocument: DocumentsModuleService["archiveDocument"];
}

export const documentModuleServices: { documents: DocumentServicePort } = {
  documents: documentsModuleService,
};
