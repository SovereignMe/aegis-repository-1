export interface CreateNoticeDto {
  recipientName: string;
  documentId?: string;
  contactId?: string;
  noticeType?: string;
  serviceMethod?: string;
  recipientAddress?: string;
  dueDate?: string;
  trackingNumber?: string;
  notes?: string;
}

export interface ServeNoticeDto {
  trackingNumber?: string;
}
