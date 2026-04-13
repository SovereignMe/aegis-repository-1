export interface RepositoryExportDto {
  exportedAt: string;
  documents: unknown[];
  tasks: unknown[];
  contacts: unknown[];
  timers: unknown[];
  auditHeadHash: string | null;
}
