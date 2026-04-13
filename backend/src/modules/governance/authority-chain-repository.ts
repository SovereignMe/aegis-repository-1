import type { AuthorityChainRecord, DocumentRecord } from '../../models/domain.js';
import { db } from '../../store/governance-store.js';
import { createAuthorityRecord } from './packet-manifest-builder.js';

export class AuthorityChainRepository {
  listAll(): AuthorityChainRecord[] { return db.authorityChain || []; }
  listByTrust(trustId: string): AuthorityChainRecord[] { return (db.authorityChain || []).filter((item) => item.trustId === trustId); }
  listForDocumentIds(documentIds: string[]): AuthorityChainRecord[] {
    const idSet = new Set(documentIds);
    return (db.authorityChain || []).filter((item) => idSet.has(item.documentId));
  }
  replaceForDocument(document: Partial<DocumentRecord> & { id: string; trustId: string }) {
    const authority = createAuthorityRecord(document as DocumentRecord);
    db.authorityChain = [authority, ...(db.authorityChain || []).filter((item) => item.documentId !== document.id)];
    return authority;
  }
}

export const authorityChainRepository = new AuthorityChainRepository();
