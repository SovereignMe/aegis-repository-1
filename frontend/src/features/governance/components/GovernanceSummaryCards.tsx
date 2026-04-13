// @ts-nocheck
export function GovernanceCard({ title, value, subtitle }) {
  return (
    <div className="premium-surface" style={{ padding: 16, borderRadius: 18, minHeight: 110 }}>
      <div className="small-label">{title}</div>
      <div className="large-title" style={{ fontSize: 28 }}>{value}</div>
      <div className="muted-inline">{subtitle}</div>
    </div>
  );
}

export function GovernanceSummaryCards({ overview, servedCount }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 18 }}>
      <GovernanceCard title="CONTROLLING DOC" value={overview?.controllingDocument?.displayId || "NONE"} subtitle={overview?.controllingDocument?.title || "Hierarchy lock inactive"} />
      <GovernanceCard title="LEDGER ENTRIES" value={overview?.counts?.ledgerEntries || 0} subtitle="Master Trust Ledger" />
      <GovernanceCard title="ACCOUNTING" value={overview?.counts?.accountingEntries || 0} subtitle="Master Accounting Ledger" />
      <GovernanceCard title="NOTICES SERVED" value={servedCount} subtitle="Notice/service tracking" />
    </div>
  );
}

export function GovernanceComplianceCards({ compliance, overview, settings }) {
  if (!compliance) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 18 }}>
      <GovernanceCard title="COMPLIANCE SCORE" value={`${compliance.score || 0}%`} subtitle={compliance.summary || "Governance checkpoints"} />
      <GovernanceCard title="ENGINE STATUS" value={(compliance.status || "unknown").toUpperCase()} subtitle={`${compliance.counts?.failed || 0} failed · ${compliance.counts?.warnings || 0} warnings`} />
      <GovernanceCard title="CHECKPOINTS" value={compliance.checkpoints?.length || 0} subtitle={`${compliance.counts?.passed || 0} passing`} />
      <GovernanceCard title="OPEN ISSUES" value={compliance.issues?.length || 0} subtitle="Actionable trust-law workflow exceptions" />
      <GovernanceCard title="APPROVAL EVENTS" value={overview?.counts?.approvals || 0} subtitle="Immutable maker-checker trail" />
      <GovernanceCard title="IMMUTABLE ARCHIVE" value={settings?.recordsGovernance?.immutableArchiveTier || "immutable-worm"} subtitle="Archive tier for governed evidence" />
    </div>
  );
}
