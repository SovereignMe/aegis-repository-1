import type { DocumentRecord, PacketRecord } from "../../models/domain.js";
import { env } from "../../config/env.js";
import { db } from "../../store/governance-store.js";
import { getManagedSignerSummary } from "./signing-model.js";

function nowIso() {
  return new Date().toISOString();
}

export function getRecordsGovernanceSettings() {
  const root = (db.settings as Record<string, any>)?.recordsGovernance || {};
  return {
    immutableArchiveTier: String(root.immutableArchiveTier || "immutable-worm"),
    exportWatermarkTemplate: String(root.exportWatermarkTemplate || "HLH FUTURE INVESTMENT TRUST | GOVERNED COPY | {displayId} | {packetCode} | {generatedAt}"),
    checksumAlgorithm: String(root.checksumAlgorithm || "sha256"),
    trustedTimestamp: root.trustedTimestamp || { provider: env.evidenceTimestampProvider, enabled: true, mode: env.evidenceTimestampMode, authorityUrl: env.evidenceTimestampAuthorityUrl || null },
    manifestSigning: root.manifestSigning || { algorithm: "Ed25519", activeKeyId: env.evidenceSigningKeyId, keyStore: env.evidenceSigningKeyStore, keys: { [env.evidenceSigningKeyId]: { publicKeyFingerprint: getManagedSignerSummary("evidence").publicKeyFingerprint, createdAt: "2026-04-02T00:00:00.000Z", status: "active", signerIdentity: env.evidenceSignerIdentity } }, rotation: { recommendedDays: 90, nextRotationReviewAt: null } },
  };
}

export function renderWatermark(template: string, params: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? "");
}

export function getApprovalSettings() {
  const root = (db.settings as Record<string, any>)?.approvals || {};
  return {
    enabled: root.enabled !== false,
    makerChecker: root.makerChecker !== false,
    roleSeparatedAuthorization: root.roleSeparatedAuthorization !== false,
    mandatoryNotes: root.mandatoryNotes !== false,
    mandatoryReasonCodes: root.mandatoryReasonCodes !== false,
    reasonCodes: Array.isArray(root.reasonCodes) ? root.reasonCodes : ["BENEFICIARY_SUPPORT", "ADMIN_RECORD", "EVIDENCE_EXPORT", "OTHER"],
    distributions: {
      enabled: root.distributions?.enabled !== false,
      baseRequiredApprovals: Number(root.distributions?.baseRequiredApprovals || 1),
      thresholdAmount: Number(root.distributions?.thresholdAmount || 5000),
      thresholdRequiredApprovals: Number(root.distributions?.thresholdRequiredApprovals || 2),
    },
    packets: {
      enabled: root.packets?.enabled !== false,
      baseRequiredApprovals: Number(root.packets?.baseRequiredApprovals || 1),
      evidencePackageRequiredApprovals: Number(root.packets?.evidencePackageRequiredApprovals || 2),
    },
  };
}

export function requireApprovalMemo(input: { notes?: string | null; reasonCode?: string | null }, actionLabel: string) {
  const settings = getApprovalSettings();
  if (settings.mandatoryNotes && String(input.notes || '').trim().length < 3) {
    const error: any = new Error(`${actionLabel} requires approval notes.`);
    error.statusCode = 400;
    throw error;
  }
  if (settings.mandatoryReasonCodes && String(input.reasonCode || '').trim().length < 2) {
    const error: any = new Error(`${actionLabel} requires a reason code.`);
    error.statusCode = 400;
    throw error;
  }
}

export function assertDualControl(requestedBy: string | null | undefined, actorEmail: string, label: string) {
  const settings = getApprovalSettings();
  if (settings.makerChecker && requestedBy && requestedBy.toLowerCase() === actorEmail.toLowerCase()) {
    const error: any = new Error(`${label} requires maker-checker separation. The requester cannot approve the same action.`);
    error.statusCode = 403;
    throw error;
  }
}

export function packetRequiredApprovals(packetType: PacketRecord["packetType"]) {
  const settings = getApprovalSettings();
  if (!settings.enabled || !settings.packets.enabled) return 0;
  return packetType === "evidence-package" ? settings.packets.evidencePackageRequiredApprovals : settings.packets.baseRequiredApprovals;
}

export function inferJurisdictionHints(jurisdiction: string | null | undefined) {
  const normalized = String(jurisdiction || "ADMINISTRATIVE").trim().toUpperCase();
  const commonDisclaimer = "Workflow support only. The platform does not determine legal sufficiency, compliance, filing validity, service validity, admissibility, or enforceability.";
  if (normalized === "PRIVATE") {
    return {
      jurisdiction: normalized,
      label: "Private trust administration",
      hints: [
        "Maintain a coherent administrative chronology across governing instruments, notices, exhibits, and supporting records.",
        "Preserve dated repository identifiers, service details, and packet manifests before external presentment.",
        commonDisclaimer,
      ],
    };
  }
  if (normalized === "PUBLIC NOTICE") {
    return {
      jurisdiction: normalized,
      label: "Public notice / recording",
      hints: [
        "Track filing office, return references, instrument identifiers, and acceptance evidence separately from internal workflow notes.",
        "Link public notice records to the supporting governing and evidentiary documents within the same packet lineage.",
        commonDisclaimer,
      ],
    };
  }
  if (normalized === "TEXAS") {
    return {
      jurisdiction: normalized,
      label: "Texas workflow cues",
      hints: [
        "Confirm venue, filing format, and service requirements against the governing Texas rule set or local clerk instructions before external use.",
        "Preserve file-stamped copies and service receipts in the packet when a later dispute or evidentiary use is anticipated.",
        commonDisclaimer,
      ],
    };
  }
  return {
    jurisdiction: normalized,
    label: "Administrative process",
    hints: [
      "Track issue dates, delivery evidence, and response windows alongside the originating document.",
      "Keep workflow records, notices, and supporting artifacts in the same evidence lineage for later review.",
      commonDisclaimer,
    ],
  };
}

export function inferRdsCode(document: Partial<DocumentRecord>) {
  const family = (document.docType || "misc").slice(0, 3).toUpperCase();
  const year = new Date(document.effectiveDate || nowIso()).getUTCFullYear();
  const sequencePart = String(db.documents.length + 1).padStart(2, "0");
  return `HLH-TR-${family}-${year}-${sequencePart}`;
}
