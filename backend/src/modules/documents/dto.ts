export interface CreateDocumentDto {
  title: string;
  docType?: string;
  jurisdiction?: string;
  status?: string;
  summary?: string;
  notes?: string;
}

export interface ArchiveDocumentDto {
  id: string;
}
