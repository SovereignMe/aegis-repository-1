import type { DocumentRecord, VerificationReport } from "../models/types";
import { apiClient, API_BASE_URL } from "./apiClient";

function buildUploadFormData(payload: Record<string, any> = {}): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "file") {
      formData.append("file", value as Blob, (value as File | undefined)?.name || "upload.bin");
      continue;
    }
    formData.append(key, String(value));
  }
  return formData;
}

export const documentService = {
  async listDocuments(query = "") {
    const path = query ? `/documents?q=${encodeURIComponent(query)}` : "/documents";
    return apiClient.get<DocumentRecord[]>(path);
  },

  async createDocument(payload: Record<string, any>) {
    return apiClient.post<DocumentRecord>("/documents", payload);
  },

  async uploadDocument(payload: Record<string, any>) {
    return apiClient.post<DocumentRecord>("/documents/upload", buildUploadFormData(payload));
  },

  async getFileMetadata(id: string) {
    return apiClient.get<Record<string, any>>(`/documents/${id}/file-metadata`);
  },

  async getVerification(id: string) {
    return apiClient.get<Record<string, any>>(`/documents/${id}/verification`);
  },

  async getVerificationReport(id: string) {
    return apiClient.get<VerificationReport>(`/documents/${id}/verification-report`);
  },

  async archiveDocument(id: string) {
    return apiClient.patch<DocumentRecord>(`/documents/${id}/archive`, {});
  },

  getDownloadUrl(id: string): string {
    return `${API_BASE_URL}/documents/${id}/download`;
  },

  downloadUrl(id: string): string {
    return `${API_BASE_URL}/documents/${id}/download`;
  },

  verificationReportUrl(id: string): string {
    return `${API_BASE_URL}/documents/${id}/verification-report`;
  },
};
