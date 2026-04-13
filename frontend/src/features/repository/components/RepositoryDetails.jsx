import { documentService } from "../../../services/documentService";

function downloadJsonFile(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function RepositoryDetails({ selected, verification, verificationReport, verificationError, verificationReportError, hintPack, canArchive, onArchive }) {
  if (!selected) {
    return <div className="empty-state-card"><div className="empty-state-title">No selection</div><div className="empty-state-copy">Choose a repository record to inspect its ledgering and governance metadata.</div></div>;
  }

  return (
    <>
      <div className="jurisdiction-inline-card">
        <div className="small-label">WORKFLOW POSITIONING</div>
        <div className="hint-pack-title">{hintPack.label}</div>
        <div className="info-card-text">{hintPack.hints[0]}</div>
        <div className="hint-disclaimer">{hintPack.disclaimer}</div>
      </div>
      <div className="detail-panel-header"><div><div className="repo-title">{selected.title}</div><div className="repo-id">{selected.displayId} • {selected.docType.toUpperCase()} • {selected.jurisdiction}</div></div><div className="tag-row"><span className="tag tag-glass">{selected.status.toUpperCase()}</span></div></div>
      <div className="detail-grid premium-detail-grid">
        <div className="grid-card glass-card"><div className="small-label">STATUS</div><div className="detail-value">{selected.status.toUpperCase()}</div></div>
        <div className="grid-card glass-card"><div className="small-label">EFFECTIVE DATE</div><div className="detail-value">{selected.effectiveDate}</div></div>
        <div className="grid-card glass-card"><div className="small-label">LEDGERS</div><div className="detail-value">{selected.ledgerIds.join(", ")}</div></div>
        <div className="grid-card glass-card"><div className="small-label">FILE</div><div className="detail-value">{selected.originalFileName || "NONE"}</div></div>
        <div className="grid-card glass-card"><div className="small-label">LEGAL HOLD</div><div className="detail-value">{verification?.legalHold ? "ON HOLD" : "CLEAR"}</div></div>
        <div className="grid-card glass-card"><div className="small-label">RETENTION</div><div className="detail-value">{verification?.retentionScheduleCode || selected.retentionScheduleCode || "UNSET"}</div></div>
        <div className="grid-card glass-card"><div className="small-label">ARCHIVE TIER</div><div className="detail-value">{verification?.archiveTier || selected.archiveTier || "STANDARD"}</div></div>
        <div className="grid-card glass-card"><div className="small-label">CHECKSUM</div><div className="detail-value">{verification?.checksumMatches === true ? "VERIFIED" : verification?.checksumMatches === false ? "MISMATCH" : "RECORDED"}</div></div>
      </div>
      <div className="info-card-text">{selected.notes}</div>
      <div className="premium-surface" style={{ padding: 14, borderRadius: 16, marginTop: 12 }}>
        <div className="small-label">RECORDS GOVERNANCE / VERIFICATION</div>
        <div className="setting-list" style={{ marginTop: 10 }}>
          <div className="setting-row"><span>Trusted timestamp</span><strong>{verification?.trustedTimestampAt ? new Date(verification.trustedTimestampAt).toLocaleString() : "Not recorded"}</strong></div>
          <div className="setting-row"><span>Timestamp token</span><strong>{verification?.trustedTimestampToken ? `${String(verification.trustedTimestampToken).slice(0, 18)}…` : "Unavailable"}</strong></div>
          <div className="setting-row"><span>Disposition target</span><strong>{verification?.retentionDispositionAt ? new Date(verification.retentionDispositionAt).toLocaleDateString() : "Permanent / policy"}</strong></div>
          <div className="setting-row"><span>Key version</span><strong>{verification?.signatureKeyId || selected.signatureKeyId || "evidence-ed25519-k1"}</strong></div>
          <div className="setting-row"><span>Watermark profile</span><strong>{verification?.watermarkTemplate ? "Configured" : "Default"}</strong></div>
          <div className="setting-row"><span>Checksum recorded</span><strong>{verification?.recordedChecksum ? `${String(verification.recordedChecksum).slice(0, 12)}…` : "None"}</strong></div>
        </div>
        {verificationError ? <div className="muted-inline" style={{ marginTop: 10 }}>{verificationError}</div> : null}
        {verificationReportError ? <div className="muted-inline" style={{ marginTop: 10 }}>{verificationReportError}</div> : null}
        {verificationReport?.reportId ? <div className="muted-inline" style={{ marginTop: 10 }}>Report ID: {verificationReport.reportId} • Hash: {String(verificationReport.reportHash || "").slice(0, 16)}…</div> : null}
        {verificationReport?.operatorChecklist?.length ? (
          <div style={{ marginTop: 12 }}>
            <div className="small-label">OPERATOR CHECKLIST</div>
            <div className="setting-list" style={{ marginTop: 10 }}>
              {verificationReport.operatorChecklist.map((item) => (
                <div className="setting-row" key={item.code} style={{ alignItems: "flex-start", gap: 12 }}>
                  <span>
                    <div style={{ fontWeight: 600 }}>{item.code}</div>
                    <div className="muted-inline" style={{ maxWidth: 420 }}>{item.detail}</div>
                  </span>
                  <strong>{String(item.status).toUpperCase()}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="tag-row">{selected.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
      <div className="action-cluster">
        {selected.storagePath ? <a className="btn btn-primary" href={documentService.getDownloadUrl(selected.id)} target="_blank" rel="noreferrer">DOWNLOAD FILE</a> : null}
        {verificationReport ? <button className="btn btn-secondary" onClick={() => downloadJsonFile(verificationReport.exportName || `${selected.displayId || selected.id}-verification-report.json`, verificationReport)}>EXPORT VERIFICATION REPORT</button> : null}
        {selected.status !== "archived" ? <button className="btn btn-secondary" onClick={() => onArchive(selected.id)} disabled={!canArchive}>ARCHIVE</button> : null}
        {!canArchive ? <span className="muted-inline">Role cannot archive repository records.</span> : null}
      </div>
    </>
  );
}
