export interface JurisdictionPolicyArtifact {
  version: string;
  policyId: string;
  defaultJurisdiction: string;
  supportBoundary: string;
  hintPacks: Record<string, string[]>;
  approvalPolicy: {
    makerChecker: boolean;
    packetRequiredApprovals: number;
    distributionThresholdApprovals: number;
  };
}

export const DEFAULT_JURISDICTION_POLICY: JurisdictionPolicyArtifact = {
  version: '2026.04.03',
  policyId: 'trust-governance-default-jurisdiction-policy',
  defaultJurisdiction: 'PRIVATE',
  supportBoundary: 'Administrative governance and evidence control only. No legal adjudication or legal advice engine.',
  hintPacks: {
    PRIVATE: ['repository-indexing', 'approval-thresholds', 'notice-sequencing'],
    TEXAS: ['filing-venue-review', 'records-integrity', 'service-proof-checklist'],
    GENERAL: ['operator-review-required', 'counsel-validation-required']
  },
  approvalPolicy: {
    makerChecker: true,
    packetRequiredApprovals: 2,
    distributionThresholdApprovals: 2
  }
};
