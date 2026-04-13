// @ts-nocheck
export function GovernanceComplianceSection({ compliance }) {
  if (!compliance) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 16, marginBottom: 16 }}>
      <div className="premium-surface" style={{ padding: 16, borderRadius: 18 }}>
        <div className="small-label">TRUST-LAW COMPLIANCE ENGINE</div>
        <div className="muted-inline" style={{ marginBottom: 12 }}>Server-side checkpointing across authority, ledgers, evidence, notices, audit continuity, and access governance.</div>
        <div className="table-shell">
          <table className="data-table">
            <thead><tr><th>Checkpoint</th><th>Status</th><th>Detail</th></tr></thead>
            <tbody>
              {(compliance.checkpoints || []).map((item) => <tr key={item.key}><td>{item.label}</td><td>{String(item.status || "").toUpperCase()}</td><td>{item.detail}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
      <div className="premium-surface" style={{ padding: 16, borderRadius: 18 }}>
        <div className="small-label">ACTION QUEUE</div>
        <div className="muted-inline" style={{ marginBottom: 12 }}>Highest-impact exceptions surfaced by the compliance engine.</div>
        <div className="setting-list">
          {(compliance.issues || []).length
            ? (compliance.issues || []).map((issue, index) => <div key={`${issue.area}-${index}`} className="setting-row"><span>{issue.message}</span><strong>{String(issue.severity || "info").toUpperCase()}</strong></div>)
            : <div className="muted-inline">No active compliance issues detected.</div>}
        </div>
      </div>
    </div>
  );
}
