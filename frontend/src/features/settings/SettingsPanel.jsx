import { useEffect, useMemo, useState } from "react";
import { LegalPoliciesPanel } from "./LegalPoliciesPanel";

const SETTINGS_VIEWS = [
  { key: "application", label: "APPLICATION & TRUST DEFAULTS" },
  { key: "legal", label: "LEGAL & POLICIES" },
];

const JURISDICTION_OPTIONS = ["PRIVATE", "Texas", "Mississippi", "New York", "Federal", "Other"];
const GOVERNING_LAW_OPTIONS = ["trust-instrument-first", "state-statute-supplemented", "hybrid-administrative"];

function cloneSettings(settings) {
  return JSON.parse(JSON.stringify(settings || {}));
}

export function SettingsPanel({ settings, onSave, canSave, health, readiness, metrics, diagnostics, refreshDiagnostics, verifyBackups }) {
  const [activeView, setActiveView] = useState("application");
  const [draft, setDraft] = useState(() => cloneSettings(settings));
  const [saveState, setSaveState] = useState("idle");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setDraft(cloneSettings(settings));
  }, [settings]);

  const updateDraft = (path, value) => {
    setDraft((current) => {
      const next = cloneSettings(current);
      let node = next;
      for (let index = 0; index < path.length - 1; index += 1) {
        const key = path[index];
        node[key] = node[key] || {};
        node = node[key];
      }
      node[path[path.length - 1]] = value;
      return next;
    });
  };

  const policySnapshot = useMemo(() => ({
    packetApprovals: draft?.approvals?.policy?.packetRequiredApprovals ?? draft?.approvals?.packets?.evidencePackageRequiredApprovals ?? 2,
    distributionThresholdAmount: draft?.approvals?.policy?.distributionThresholdAmount ?? draft?.approvals?.distributions?.thresholdAmount ?? 5000,
    distributionThresholdApprovals: draft?.approvals?.policy?.distributionThresholdApprovals ?? draft?.approvals?.distributions?.thresholdRequiredApprovals ?? 2,
    policyActivationApprovals: draft?.approvals?.policy?.policyActivationApprovals ?? 2,
  }), [draft]);

  if (!settings) return null;

  const handleSave = async () => {
    try {
      setSaveState("saving");
      setSaveError("");
      await onSave?.(draft);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1800);
    } catch (error) {
      setSaveState("error");
      setSaveError(error?.message || "Unable to save settings.");
    }
  };

  return (
    <section className="single-panel premium-surface">
      <div className="module-header">
        <div>
          <div className="small-label">CONFIGURATION LAYER</div>
          <div className="large-title">SETTINGS</div>
          <div className="large-sub">AEGIS GOVERNANCE CONFIGURATION, JURISDICTION HINTS, AND PLATFORM POSITIONING</div>
        </div>
        <div className="module-callout">
          <div className="small-label">LEGAL BOUNDARY</div>
          <div className="callout-title">AEGIS Governance / Evidence Control</div>
          <div className="callout-copy">The app supports administrative governance, evidence control, and workflow discipline. It does not provide legal adjudication, determine legal sufficiency, or replace counsel.</div>
        </div>
        {!canSave ? <div className="muted-inline">Current role cannot modify governed settings.</div> : null}
      </div>

      <div className="settings-subnav">
        {SETTINGS_VIEWS.map((view) => (
          <button
            key={view.key}
            type="button"
            className={`settings-subnav-btn ${activeView === view.key ? "settings-subnav-btn-active" : ""}`}
            onClick={() => setActiveView(view.key)}
          >
            {view.label}
          </button>
        ))}
      </div>

      {activeView === "application" ? (
        <div className="card-grid premium-card-grid">
          <div className="info-card premium-card">
            <div className="info-card-title">AEGIS GOVERNANCE</div>
            <div className="setting-list">
              <div className="setting-row"><span>Brand</span><strong>AEGIS</strong></div>
              <div className="setting-row"><span>Product</span><strong>AEGIS Governance</strong></div>
              <div className="setting-row"><span>Tagline</span><strong>Governance. Verification. Control. • aegisgovernance.io</strong></div>
              <div className="setting-row"><span>AEGIS Central</span><strong>Governance workspace command layer</strong></div>
              <div className="setting-row"><span>AEGIS Registry</span><strong>Administrative records and exhibits</strong></div>
              <div className="setting-row"><span>AEGIS Service</span><strong>Notices and service workflow</strong></div>
              <div className="setting-row"><span>AEGIS Authority</span><strong>Approvals and decision trail</strong></div>
              <div className="setting-row"><span>AEGIS Verify</span><strong>Verification and integrity control</strong></div>
            </div>
            <div className="muted-inline" style={{ marginBottom: 12 }}>A fiduciary governance platform for notices, approvals, packet readiness, verification, and administrative record control.</div>
          </div>
          <div className="info-card premium-card">
            <div className="info-card-title">PLATFORM BOUNDARY</div>
            <div className="setting-list">
              <div className="setting-row"><span>Mode</span><strong>{draft?.platformBoundary?.mode || "administrative-governance-and-evidence-control"}</strong></div>
              <div className="setting-row"><span>Legal Adjudication</span><strong>{draft?.platformBoundary?.legalAdjudicationEnabled ? "Enabled" : "Not Supported"}</strong></div>
              <div className="setting-row"><span>Disclaimer Version</span><strong>{draft?.platformBoundary?.disclaimerVersion || "current"}</strong></div>
            </div>
            <div className="muted-inline" style={{ marginBottom: 12 }}>{draft?.platformBoundary?.supportScope || "Supports administrative governance, records control, packet assembly, and evidence preservation only."}</div>
          </div>

          <div className="info-card premium-card">
            <div className="info-card-title">TRUST INSTRUMENT METADATA</div>
            <div className="intake-grid premium-form-grid">
              <input className="form-input" value={draft?.trust?.trustName || ""} onChange={(e) => updateDraft(["trust", "trustName"], e.target.value)} placeholder="Trust name" disabled={!canSave} />
              <input className="form-input" value={draft?.trust?.trustCode || ""} onChange={(e) => updateDraft(["trust", "trustCode"], e.target.value)} placeholder="Trust code" disabled={!canSave} />
              <input className="form-input" value={draft?.trust?.instrumentMetadata?.controllingInstrumentName || ""} onChange={(e) => updateDraft(["trust", "instrumentMetadata", "controllingInstrumentName"], e.target.value)} placeholder="Controlling instrument name" disabled={!canSave} />
              <input className="form-input" type="date" value={draft?.trust?.instrumentMetadata?.controllingInstrumentDate || ""} onChange={(e) => updateDraft(["trust", "instrumentMetadata", "controllingInstrumentDate"], e.target.value)} disabled={!canSave} />
              <input className="form-input" value={draft?.trust?.instrumentMetadata?.governingInstrumentIds?.join(", ") || ""} onChange={(e) => updateDraft(["trust", "instrumentMetadata", "governingInstrumentIds"], e.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder="Governing instrument IDs (comma separated)" disabled={!canSave} />
              <input className="form-input" value={draft?.trust?.instrumentMetadata?.repositoryPrefix || ""} onChange={(e) => updateDraft(["trust", "instrumentMetadata", "repositoryPrefix"], e.target.value)} placeholder="Repository prefix" disabled={!canSave} />
            </div>
          </div>

          <div className="info-card premium-card">
            <div className="info-card-title">JURISDICTION PROFILE</div>
            <div className="intake-grid premium-form-grid">
              <select className="form-input" value={draft?.trust?.jurisdiction || "PRIVATE"} onChange={(e) => { updateDraft(["trust", "jurisdiction"], e.target.value); updateDraft(["trust", "jurisdictionProfile", "primaryJurisdiction"], e.target.value); }} disabled={!canSave}>
                {JURISDICTION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <select className="form-input" value={draft?.trust?.jurisdictionProfile?.governingLawMode || "trust-instrument-first"} onChange={(e) => updateDraft(["trust", "jurisdictionProfile", "governingLawMode"], e.target.value)} disabled={!canSave}>
                {GOVERNING_LAW_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <input className="form-input" value={draft?.trust?.jurisdictionProfile?.filingVenue || ""} onChange={(e) => updateDraft(["trust", "jurisdictionProfile", "filingVenue"], e.target.value)} placeholder="Primary venue / forum notes" disabled={!canSave} />
              <input className="form-input" value={draft?.trust?.jurisdictionProfile?.hintPackKey || ""} onChange={(e) => updateDraft(["trust", "jurisdictionProfile", "hintPackKey"], e.target.value)} placeholder="Hint pack key" disabled={!canSave} />
            </div>
            <div className="muted-inline">Jurisdiction fields drive non-authoritative workflow hints only. They do not adjudicate venue, compliance, or legal sufficiency.</div>
          </div>

          <div className="info-card premium-card">
            <div className="info-card-title">FIDUCIARY ROLE ASSIGNMENTS</div>
            <div className="intake-grid premium-form-grid">
              <input className="form-input" value={draft?.trust?.fiduciaryRoles?.trustee || ""} onChange={(e) => updateDraft(["trust", "fiduciaryRoles", "trustee"], e.target.value)} placeholder="Trustee" disabled={!canSave} />
              <input className="form-input" value={draft?.trust?.fiduciaryRoles?.successorTrustee || ""} onChange={(e) => updateDraft(["trust", "fiduciaryRoles", "successorTrustee"], e.target.value)} placeholder="Successor trustee" disabled={!canSave} />
              <input className="form-input" value={draft?.trust?.fiduciaryRoles?.trustProtector || ""} onChange={(e) => updateDraft(["trust", "fiduciaryRoles", "trustProtector"], e.target.value)} placeholder="Trust protector" disabled={!canSave} />
              <input className="form-input" value={draft?.trust?.fiduciaryRoles?.distributionCommittee || ""} onChange={(e) => updateDraft(["trust", "fiduciaryRoles", "distributionCommittee"], e.target.value)} placeholder="Distribution committee" disabled={!canSave} />
              <input className="form-input" value={draft?.trust?.fiduciaryRoles?.recordsOfficer || ""} onChange={(e) => updateDraft(["trust", "fiduciaryRoles", "recordsOfficer"], e.target.value)} placeholder="Records officer" disabled={!canSave} />
            </div>
          </div>

          <div className="info-card premium-card">
            <div className="info-card-title">APPROVAL POLICIES</div>
            <div className="intake-grid premium-form-grid">
              <select className="form-input" value={draft?.approvals?.makerChecker === false ? "optional" : "required"} onChange={(e) => { const required = e.target.value !== "optional"; updateDraft(["approvals", "makerChecker"], required); updateDraft(["approvals", "policy", "makerChecker"], required); }} disabled={!canSave}>
                <option value="required">Maker-checker required</option>
                <option value="optional">Maker-checker optional</option>
              </select>
              <input className="form-input" type="number" min="1" value={policySnapshot.packetApprovals} onChange={(e) => updateDraft(["approvals", "policy", "packetRequiredApprovals"], Number(e.target.value || 1))} placeholder="Packet approvals" disabled={!canSave} />
              <input className="form-input" type="number" min="0" value={policySnapshot.distributionThresholdAmount} onChange={(e) => updateDraft(["approvals", "policy", "distributionThresholdAmount"], Number(e.target.value || 0))} placeholder="Distribution threshold amount" disabled={!canSave} />
              <input className="form-input" type="number" min="1" value={policySnapshot.distributionThresholdApprovals} onChange={(e) => updateDraft(["approvals", "policy", "distributionThresholdApprovals"], Number(e.target.value || 1))} placeholder="Distribution threshold approvals" disabled={!canSave} />
              <input className="form-input" type="number" min="1" value={policySnapshot.policyActivationApprovals} onChange={(e) => updateDraft(["approvals", "policy", "policyActivationApprovals"], Number(e.target.value || 1))} placeholder="Policy activation approvals" disabled={!canSave} />
            </div>
            <div className="muted-inline">These settings govern administrative approval workflow only. They do not resolve substantive legal rights.</div>
          </div>

          <div className="info-card premium-card">
            <div className="info-card-title">OBSERVABILITY & OPERATIONS</div>
            <div className="setting-list">
              <div className="setting-row"><span>Health</span><strong>{health?.status || "unknown"}</strong></div>
              <div className="setting-row"><span>Readiness</span><strong>{readiness?.status || "unknown"}</strong></div>
              <div className="setting-row"><span>Structured Logging</span><strong>{diagnostics?.logging?.structured ? "Enabled" : "Enabled"}</strong></div>
              <div className="setting-row"><span>Backup Verification</span><strong>{diagnostics?.backups?.lastVerificationAt || "Pending"}</strong></div>
              <div className="setting-row"><span>Metrics Snapshot</span><strong>{metrics?.http?.totalRequests || 0} HTTP requests</strong></div>
            </div>
            <div className="action-cluster" style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-secondary" onClick={() => refreshDiagnostics?.()}>REFRESH DIAGNOSTICS</button>
              <button type="button" className="btn btn-secondary" onClick={() => verifyBackups?.()}>VERIFY BACKUPS</button>
            </div>
          </div>

          <div className="info-card premium-card">
            <div className="info-card-title">SAVE GOVERNED SETTINGS</div>
            <div className="muted-inline">Persist trust instrument metadata, jurisdiction profile, fiduciary role assignments, and approval policies as governed configuration.</div>
            <div className="action-cluster" style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-primary" disabled={!canSave || saveState === "saving"} onClick={handleSave}>{saveState === "saving" ? "SAVING..." : "SAVE SETTINGS"}</button>
            </div>
            {saveState === "saved" ? <div className="muted-inline" style={{ marginTop: 12 }}>Settings saved.</div> : null}
            {saveError ? <div className="muted-inline" style={{ marginTop: 12, color: "#ffb4b4" }}>{saveError}</div> : null}
          </div>
        </div>
      ) : null}

      {activeView === "legal" ? <LegalPoliciesPanel /> : null}
    </section>
  );
}
