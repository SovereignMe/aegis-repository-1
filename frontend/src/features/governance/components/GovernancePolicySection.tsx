// @ts-nocheck
import { useMemo, useState } from "react";

const POLICY_TYPES = [
  { value: "trust-policy-template", label: "Trust Policy Template" },
  { value: "approval-thresholds", label: "Approval Thresholds" },
  { value: "jurisdiction-hint-pack", label: "Jurisdiction Hint Pack" },
];

export function GovernancePolicySection({ overview, policies, canWrite, onCreatePolicyVersion, onActivatePolicyVersion }) {
  const [policyType, setPolicyType] = useState("trust-policy-template");
  const [title, setTitle] = useState("Trust Policy Template");
  const [changeSummary, setChangeSummary] = useState("");
  const [activate, setActivate] = useState(true);
  const [contentText, setContentText] = useState(`{\n  "template": "Controlling trust policy text",\n  "jurisdiction": "PRIVATE"\n}`);

  const grouped = useMemo(() => (policies?.versions || []).reduce((acc, item) => {
    const key = item.policyType || "other";
    (acc[key] ||= []).push(item);
    return acc;
  }, {}), [policies]);

  return (
    <div className="premium-surface" style={{ padding: 16, borderRadius: 18, marginTop: 16 }}>
      <div className="small-label">POLICY / VERSION GOVERNANCE</div>
      <div className="muted-inline" style={{ marginBottom: 12 }}>Signed policy history, versioned trust templates, approval thresholds, and jurisdiction hint packs.</div>
      <div className="intake-grid premium-form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 12 }}>
        <div><div className="small-label">ACTIVE TEMPLATE</div><div>{overview?.policyGovernance?.activeVersionIds?.["trust-policy-template"] || "None"}</div></div>
        <div><div className="small-label">ACTIVE THRESHOLDS</div><div>{overview?.policyGovernance?.activeVersionIds?.["approval-thresholds"] || "None"}</div></div>
        <div><div className="small-label">ACTIVE HINT PACK</div><div>{overview?.policyGovernance?.activeVersionIds?.["jurisdiction-hint-pack"] || "None"}</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 16 }}>
        <div>
          <div className="intake-grid premium-form-grid">
            <select className="form-input" value={policyType} onChange={(e) => { setPolicyType(e.target.value); setTitle(POLICY_TYPES.find((item) => item.value === e.target.value)?.label || "Policy"); }}>
              {POLICY_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Version title" />
            <input className="form-input" value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} placeholder="Change summary" />
          </div>
          <textarea className="form-input" style={{ minHeight: 180, marginTop: 12 }} value={contentText} onChange={(e) => setContentText(e.target.value)} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}><input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} />Activate immediately</label>
          <div className="action-cluster" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" disabled={!canWrite || !onCreatePolicyVersion} onClick={() => { let content = {}; try { content = JSON.parse(contentText || "{}"); } catch { return alert("Policy content must be valid JSON."); } onCreatePolicyVersion?.({ policyType, title, changeSummary, activate, content }); }}>SAVE POLICY VERSION</button>
          </div>
        </div>
        <div className="table-shell">
          <table className="data-table">
            <thead><tr><th>Policy</th><th>Version</th><th>Status</th><th>History</th><th></th></tr></thead>
            <tbody>
              {(policies?.versions || []).slice(0, 12).map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td><td>v{item.version}</td><td>{item.status}</td><td><code>{String(item.historyHash || "").slice(0, 12)}</code></td>
                  <td>{item.status !== "active" && canWrite && onActivatePolicyVersion ? <button className="btn btn-secondary" onClick={() => onActivatePolicyVersion(item.policyType, item.id)}>Activate</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="muted-inline" style={{ marginTop: 10 }}>Signed history preserved: {overview?.policyGovernance?.signedHistoryPreserved ? "Yes" : "No"}</div>
        </div>
      </div>
    </div>
  );
}
