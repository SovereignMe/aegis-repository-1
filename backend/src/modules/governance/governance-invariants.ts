import crypto from "node:crypto";
import type { DocumentRecord, PacketRecord } from "../../models/domain.js";
import { db } from "../../store/governance-store.js";

function fail(message: string, statusCode = 409) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  throw error;
}

export function assertDocumentsBelongToTrust(documentIds: string[], trustId: string, label = "Document") {
  for (const id of documentIds) {
    const document = (db.documents || []).find((item) => item.id === id && !item.deletedAt);
    if (!document) {
      fail(`${label} ${id} was not found.`, 404);
      continue;
    }
    if (document.trustId !== trustId) {
      fail(`${label} ${id} is outside the packet trust scope.`, 403);
    }
  }
}

export function assertExhibitLinkageForDocuments(documents: DocumentRecord[], trustId: string) {
  const missing = documents.filter((document) => !(db.exhibitIndex || []).some((entry) => entry.documentId === document.id && entry.trustId === trustId));
  if (missing.length) {
    fail(`Packet cannot be finalized until every included document has exhibit linkage. Missing: ${missing.map((item) => item.displayId || item.id).join(", ")}.`);
  }
}

export function assertApprovedDistributionAccounting(distributionId: string, trustId: string) {
  const distribution = (db.distributions || []).find((item) => item.id === distributionId && item.trustId === trustId && !item.deletedAt);
  if (!distribution) {
    fail("Distribution not found.", 404);
    return;
  }
  if (distribution.status !== "approved") return;
  const matchingEntry = (db.accountingEntries || []).some((entry) => entry.distributionId === distributionId && entry.trustId === trustId && !entry.deletedAt);
  if (!matchingEntry) {
    fail(`Approved distribution ${distribution.requestCode || distribution.id} is missing a matching accounting entry.`);
  }
}

export function createManifestDeterminismHash(packet: Pick<PacketRecord, "id" | "trustId" | "packetType" | "title" | "documentIds" | "noticeIds" | "requiredApprovals">) {
  const payload = JSON.stringify({
    id: packet.id,
    trustId: packet.trustId,
    packetType: packet.packetType,
    title: packet.title,
    documentIds: [...(packet.documentIds || [])].sort(),
    noticeIds: [...(packet.noticeIds || [])].sort(),
    requiredApprovals: packet.requiredApprovals || 0,
  });

  return crypto.createHash("sha256").update(payload).digest("hex");
}
