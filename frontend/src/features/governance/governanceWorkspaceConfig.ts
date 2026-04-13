export const GOVERNANCE_WORKSPACE_PAGES = [
  { key: 'overview', label: 'Overview', tier: 1, description: 'Readiness triage for packets, service, distributions, and governed records.' },
  { key: 'administrative-records', label: 'AEGIS Registry', tier: 1, description: 'Administrative record indexing, authority linkage, and exhibit control.' },
  { key: 'notices', label: 'AEGIS Service', tier: 1, description: 'Notice lifecycle, proof of service, and service exceptions.' },
  { key: 'beneficiaries', label: 'Beneficiaries', tier: 1, description: 'Profiles, class, standing, and linked governance actions.' },
  { key: 'ledgers', label: 'AEGIS Ledger', tier: 1, description: 'Master ledger, accounting, reconciliation, and journal support.' },
  { key: 'packets', label: 'AEGIS Packet', tier: 2, description: 'Packet assembly, manifest review, and sealing readiness.' },
  { key: 'approvals', label: 'AEGIS Authority', tier: 2, description: 'Maker-checker queue, thresholds, and decision trail.' },
  { key: 'policies', label: 'Policies & Authority', tier: 2, description: 'Policy versions, authority chain, and governing basis.' },
  { key: 'verification', label: 'AEGIS Verify', tier: 2, description: 'Integrity checks, deficiencies, and audit preservation.' },
] as const;

export type GovernanceWorkspacePageKey = typeof GOVERNANCE_WORKSPACE_PAGES[number]['key'];

export const GOVERNANCE_WORKSPACE_PAGE_SET = new Set<string>(GOVERNANCE_WORKSPACE_PAGES.map((item) => item.key));

export function resolveGovernancePageKey(value?: string | null): GovernanceWorkspacePageKey {
  const normalized = String(value || '').trim().toLowerCase();
  return (GOVERNANCE_WORKSPACE_PAGE_SET.has(normalized) ? normalized : 'overview') as GovernanceWorkspacePageKey;
}
