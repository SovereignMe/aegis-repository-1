export function IntegrationsPanel({ integrations, onMarkSync, canSync }) {
  if (!integrations?.length) {
    return (
      <section className="single-panel premium-surface">
        <div className="module-header">
          <div>
            <div className="small-label">EXTERNAL CHANNELS</div>
            <div className="large-title">INTEGRATIONS</div>
            <div className="large-sub">HIDDEN UNTIL SECURE OAUTH, LEAST-PRIVILEGE SCOPES, AND PROVIDER CONSENT FLOWS ARE READY</div>
          </div>
        </div>
        <div className="info-card premium-card">
          <div className="info-card-title">NO ACTIVE INTEGRATIONS</div>
          <div className="info-card-text">Gmail, Google Calendar, and cloud sync have been removed from the active product surface until they are backed by real provider connections, secure OAuth consent, and narrowly scoped permissions.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="single-panel premium-surface">
      <div className="module-header">
        <div>
          <div className="small-label">EXTERNAL CHANNELS</div>
          <div className="large-title">INTEGRATIONS</div>
          <div className="large-sub">ONLY REAL, CONFIGURED PROVIDERS ARE SHOWN HERE</div>
        </div>
        <div className="module-callout">
          <div className="small-label">CONNECTED SURFACES</div>
          <div className="callout-title">{integrations.length}</div>
          <div className="callout-copy">Every visible connector should be backed by secure OAuth and tenant-scoped permissions.</div>
        </div>
      </div>

      <div className="card-grid premium-card-grid">
        {integrations.map((integration) => (
          <div className="info-card premium-card integration-card" key={integration.id}>
            <div className="info-card-title">{integration.provider.toUpperCase()}</div>
            <div className="info-card-meta">STATUS: {integration.status.toUpperCase()}</div>
            <div className="info-card-text">Capabilities: {(integration.capabilities || []).join(" • ")}</div>
            <div className="action-cluster">
              <button className="btn btn-secondary" disabled={!canSync} onClick={() => onMarkSync(integration.id)} title={!canSync ? "Current role cannot manage integrations." : "Mark sync"}>MARK SYNC</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
