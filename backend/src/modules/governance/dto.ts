export interface CreateBeneficiaryDto {
  fullName: string;
  beneficiaryType?: string;
  allocationPercent?: number;
  notes?: string;
}

export interface BuildPacketDto {
  packetType: "administrative-record" | "evidence-package";
  title: string;
  documentIds?: string[];
  noticeIds?: string[];
  notes?: string;
  reasonCode?: string;
}

export interface ApprovalDecisionDto {
  notes: string;
  reasonCode: string;
}
