
export function AuditPanel({ auditTrail, verification, storageMeta, canReadFull, canVerify }) {
  return (
    <section className="single-panel premium-surface">
      <div className="module-header">
        <div>
          <div className="small-label">INTEGRITY LEDGER</div>
          <div className="large-title">AUDITS</div>
          <div className="large-sub">APPEND-ONLY HASH-CHAINED EVENT HISTORY WITH DURABLE BACKEND PERSISTENCE</div>
        </div>
        <div className="module-callout">
          <div className="small-label">VERIFY CHAIN</div>
          <div className="callout-title">{canVerify ? (verification?.valid ? "VERIFIED" : "ATTENTION") : "RESTRICTED"}</div>
          <div className="callout-copy">{canVerify ? "Storage and event integrity are continuously summarized here for operator review." : "Verification and full ledger review require explicit audit grants."}</div>
        </div>
      </div>

      <div className="detail-grid premium-detail-grid audit-summary-grid" style={{ marginBottom: 20 }}>
        <div className="grid-card glass-card"><div className="small-label">STORAGE MODE</div><div className="detail-value">{storageMeta?.mode?.toUpperCase() || "UNKNOWN"}</div></div>
        <div className="grid-card glass-card"><div className="small-label">LAST PERSISTED</div><div className="detail-value">{storageMeta?.lastPersistedAt ? new Date(storageMeta.lastPersistedAt).toLocaleString() : "NOT YET"}</div></div>
        <div className="grid-card glass-card"><div className="small-label">AUDIT STATUS</div><div className="detail-value">{canVerify ? (verification?.valid ? "VERIFIED" : "CHECK REQUIRED") : "SUMMARY ONLY"}</div></div>
        <div className="grid-card glass-card"><div className="small-label">HEAD HASH</div><div className="detail-value">{verification?.headHash ? verification.headHash.slice(0, 16) : "N/A"}</div></div>
      </div>

      {canVerify && verification?.issues?.length ? (
        <div className="repo-card premium-list-card alert-card" style={{ marginBottom: 20 }}>
          <div className="repo-title">VERIFICATION ISSUES</div>
          <div className="info-card-text">{verification.issues.join(" ")}</div>
        </div>
      ) : null}

      {!canReadFull ? (
        <div className="repo-card premium-list-card" style={{ marginBottom: 20 }}>
          <div className="repo-title">FULL AUDIT LOG RESTRICTED</div>
          <div className="info-card-text">This role can view audit health metadata only. Full event history requires the explicit permission <strong>AUDIT.FULL.READ</strong>.</div>
        </div>
      ) : null}

      {canReadFull ? (
        <div className="stack audit-stack">
          {auditTrail.slice(0, 25).map((entry) => (
            <div className="repo-card premium-list-card audit-event-card" key={entry.id}>
              <div className="repo-card-top">
                <div>
                  <div className="repo-title">{entry.action}</div>
                  <div className="repo-id">{entry.entityType?.toUpperCase()} • {entry.actor} • {new Date(entry.createdAt).toLocaleString()}</div>
                  <div className="info-card-text">SEQ {entry.sequence} • HASH {entry.hash.slice(0, 12)} • PREV {entry.previousHash ? entry.previousHash.slice(0, 12) : "ROOT"}</div>
                </div>
                <div className="tag-row">{entry.entityId ? <span className="tag">{entry.entityId.slice(0, 8)}</span> : null}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
