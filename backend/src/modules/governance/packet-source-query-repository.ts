import type {
  AccountingEntryRecord,
  AuthorityChainRecord,
  DocumentRecord,
  ExhibitIndexRecord,
  NoticeRecord,
  TrustLedgerEntryRecord,
  TrustRecord,
} from '../../models/domain.js';
import { db } from '../../store/governance-store.js';
import { noticeRepository } from '../notices/repositories.js';
import { authorityChainRepository } from './authority-chain-repository.js';

export interface PacketAssemblyInputs {
  trust: TrustRecord | null;
  documents: DocumentRecord[];
  notices: NoticeRecord[];
  ledgerEntries: TrustLedgerEntryRecord[];
  exhibits: ExhibitIndexRecord[];
  authorityChain: AuthorityChainRecord[];
  accountingEntries: AccountingEntryRecord[];
}

export class PacketSourceQueryRepository {
  getAssemblyInputs(params: { trustId: string; documentIds: string[]; noticeIds: string[] }): PacketAssemblyInputs {
    const documentIdSet = new Set(params.documentIds);
    const documents = (db.documents || []).filter((item) => !item.deletedAt && item.trustId === params.trustId && documentIdSet.has(item.id));

    const notices = noticeRepository
      .listActiveByIds(params.noticeIds || [])
      .filter((item) => item.trustId === params.trustId);

    const relevantDocumentIds = new Set<string>([
      ...documents.map((item) => item.id),
      ...notices.map((item) => item.documentId).filter((id): id is string => Boolean(id)),
    ]);

    const ledgerEntries = (db.trustLedgerEntries || []).filter(
      (item) => !item.deletedAt && item.trustId === params.trustId && Boolean(item.documentId) && relevantDocumentIds.has(String(item.documentId)),
    );

    const exhibits = (db.exhibitIndex || []).filter(
      (item) => !item.deletedAt && item.trustId === params.trustId && documentIdSet.has(item.documentId),
    );

    const authorityChain = authorityChainRepository.listForDocumentIds(documents.map((item) => item.id))
      .filter((item) => item.trustId === params.trustId);

    const ledgerEntryIdSet = new Set(ledgerEntries.map((item) => item.id));
    const accountingEntries = (db.accountingEntries || []).filter(
      (item) => item.trustId === params.trustId && (
        (item.documentId ? relevantDocumentIds.has(item.documentId) : false) ||
        (item.distributionId ? ledgerEntryIdSet.has(item.distributionId) : false)
      ),
    );

    const trust = (db.trusts || []).find((item) => item.id === params.trustId) || null;

    return {
      trust,
      documents,
      notices,
      ledgerEntries,
      exhibits,
      authorityChain,
      accountingEntries,
    };
  }

  getAuditVerification(trustId?: string | null) {
    return db.verifyAudit(trustId || undefined);
  }
}

export const packetSourceQueryRepository = new PacketSourceQueryRepository();
