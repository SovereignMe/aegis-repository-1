export interface RequestDistributionDto {
  beneficiaryId: string;
  amount: number;
  documentId?: string;
  category?: string;
  currency?: string;
  notes?: string;
}

export interface DistributionApprovalDto {
  notes: string;
  reasonCode: string;
}
