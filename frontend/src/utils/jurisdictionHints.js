const RULE_PACKS = {
  PRIVATE: {
    label: "Private trust administration",
    hints: [
      "Sequence governing instruments, notices, and exhibits into a coherent administrative record before external presentment.",
      "Use a dated trust code, exhibit index, and service metadata so repository records can be reconciled later.",
      "If a step depends on court, agency, or recorder action, obtain human review because the platform does not determine legal sufficiency.",
    ],
  },
  ADMINISTRATIVE: {
    label: "Administrative process",
    hints: [
      "Track issuance dates, response windows, and proof-of-service details in the workflow before escalating a notice path.",
      "Preserve the originating document, outgoing notice, delivery evidence, and follow-up task in the same packet lineage.",
      "Agency and tribunal rules vary; treat these workflow hints as informational only and confirm jurisdiction-specific requirements independently.",
    ],
  },
  "PUBLIC NOTICE": {
    label: "Public notice / recording",
    hints: [
      "Capture instrument identifiers, filing office details, and returned recording references as separate repository fields.",
      "Link any public notice record to its supporting governing instrument and evidence of delivery or filing acceptance.",
      "Recorder and filing standards vary by office; the platform organizes the workflow but does not certify acceptance or compliance.",
    ],
  },
  TEXAS: {
    label: "Texas workflow cues",
    hints: [
      "Confirm venue, filing format, and service method against the governing Texas rule set or local clerk instructions before external use.",
      "Preserve signed copies, file-stamped returns, and service receipts with the packet if a dispute or evidentiary use is anticipated.",
      "These cues are non-authoritative workflow prompts only and do not determine legal sufficiency under Texas law.",
    ],
  },
};

function normalizeKey(value) {
  return String(value || '').trim().toUpperCase();
}

export function getJurisdictionHintPack(jurisdiction, trustName) {
  const key = normalizeKey(jurisdiction);
  const pack = RULE_PACKS[key] || RULE_PACKS.ADMINISTRATIVE;
  return {
    key: key || 'ADMINISTRATIVE',
    label: pack.label,
    trustName: trustName || 'Active trust',
    hints: pack.hints,
    disclaimer:
      'Non-authoritative workflow support only. The software does not determine legal sufficiency, jurisdictional compliance, filing validity, service validity, or enforceability.',
  };
}
