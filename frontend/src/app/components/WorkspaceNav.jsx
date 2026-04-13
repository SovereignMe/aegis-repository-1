import { canAccessAuditTab, canAccessGovernanceTab } from "../hooks/useWorkspaceTabs";
import AegisIcon from '../../assets/aegis/aegis-logo1.webp';

export function WorkspaceNav({ store, tabs, activeTab, onSelectTab }) {
  return (
    <section className="single-panel nav-panel premium-surface fade-in delay-3">
      <div className="nav-header">
        <div className="nav-brand-cluster">
          <div className="nav-brand-row"><img src={AegisIcon} alt="AEGIS mark" className="nav-brand-mark upgraded" /><div className="nav-brand-copy"><div className="nav-brand-name">AEGIS Governance</div><div className="nav-label">WORKSPACE NAVIGATION</div></div></div>
        </div>
        <div className="status-chip"><span className="status-dot" />LIVE GOVERNANCE NODE</div>
      </div>
      <div className="control-rail">
        {tabs.filter((tab) => {
          if (tab.key === "governance") return canAccessGovernanceTab(store);
          if (tab.key === "audit") return canAccessAuditTab(store);
          return !tab.action || store.can(tab.action);
        }).map((tab, index) => {
          const allowed = tab.key === "governance"
            ? canAccessGovernanceTab(store)
            : tab.key === "audit"
              ? canAccessAuditTab(store)
              : (!tab.action || store.can(tab.action));
          return (
            <button key={tab.key} className={`control-btn ${activeTab === tab.key ? "control-btn-active" : ""}`} onClick={() => allowed && onSelectTab(tab.key)} style={{ animationDelay: `${index * 40}ms` }} disabled={!allowed} title={allowed ? tab.label : `Role ${store.role} lacks ${tab.action || "required scope"}`}>
              {activeTab === tab.key ? <span className="control-btn-topline" /> : null}
              <span className="control-btn-text">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
