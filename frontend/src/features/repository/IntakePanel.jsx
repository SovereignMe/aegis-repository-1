import { useMemo, useState } from "react";
import { getJurisdictionHintPack } from "../../utils/jurisdictionHints";

const initialForm = {
  title: "",
  docType: "correspondence",
  jurisdiction: "ADMINISTRATIVE",
  status: "pending",
  summary: "",
  notes: "",
  deadlinePresetDays: "",
  file: null,
};


export function IntakePanel({ settings, onCreate, canIntake, deadlineRules = [] }) {
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);

  const intakeDeadlineEligible = ["correspondence", "notice"].includes(form.docType);
  const presetRules = useMemo(() => deadlineRules.filter((rule) => rule.code !== "CUSTOM"), [deadlineRules]);
  const hintPack = useMemo(() => getJurisdictionHintPack(form.jurisdiction || settings?.trust?.jurisdiction, settings?.trust?.trustName), [form.jurisdiction, settings]);

  const handleSubmit = async () => {
    setBusy(true);
    try {
      const payload = {
        ...form,
        deadlinePresetDays: intakeDeadlineEligible && form.deadlinePresetDays ? Number(form.deadlinePresetDays) : null,
        tags: intakeDeadlineEligible ? [form.docType.toUpperCase(), form.jurisdiction.toUpperCase(), form.status.toUpperCase(), "INTAKE"] : undefined,
      };
      if (form.file) {
        payload.file = form.file;
      }
      await onCreate(payload);
      setForm(initialForm);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="single-panel premium-surface">
      <div className="module-shell">
        <div className="module-header">
          <div>
            <div className="small-label">CONTROLLED ORIGINATION</div>
            <div className="large-title">INTAKE</div>
            <div className="large-sub">Create the governance record, optionally attach the native file, then launch the deadline workflow from one controlled origin.</div>
          </div>
          <div className="module-callout">
            <div className="small-label">INTAKE MODE</div>
            <div className="callout-title">RECORD + FILE + AUDIT</div>
            <div className="callout-copy">Uploads are durably stored and linked to the repository record with checksum metadata.</div>
          </div>
        </div>
      </div>

      <div className="module-form-shell">
        <div className="intake-grid premium-form-grid">
          <input className="form-input" placeholder="DOCUMENT TITLE" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="form-select" value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value, deadlinePresetDays: ["correspondence", "notice"].includes(e.target.value) ? form.deadlinePresetDays : "" })}>
            <option value="governing">GOVERNING</option>
            <option value="certification">CERTIFICATION</option>
            <option value="perfection">PERFECTION</option>
            <option value="correspondence">CORRESPONDENCE</option>
            <option value="notice">NOTICE</option>
            <option value="accounting">ACCOUNTING</option>
          </select>
          <input className="form-input" placeholder="JURISDICTION" value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} />
          <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="pending">PENDING</option>
            <option value="active">ACTIVE</option>
            <option value="recorded">RECORDED</option>
          </select>
          <input className="form-input" placeholder="SUMMARY" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          <textarea className="form-textarea" placeholder="NOTES" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} />
          <input className="form-input" type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
        </div>

        <div className="jurisdiction-hint-block premium-callout-block">
          <div className="small-label">JURISDICTION-AWARE WORKFLOW HINTS</div>
          <div className="hint-pack-title">{hintPack.label}</div>
          <ul className="hint-list">{hintPack.hints.map((hint) => <li key={hint}>{hint}</li>)}</ul>
          <div className="hint-disclaimer">{hintPack.disclaimer}</div>
        </div>

        <div className="deadline-block intake-deadline-block premium-callout-block">
          <div className="small-label">INTAKE DEADLINES</div>
          <div className="info-card-text">Correspondence and notice records can open the deadline workflow immediately. The resulting task and timer are written into the audit chain.</div>
          <div className="deadline-row">
            <select className="form-select" value={form.deadlinePresetDays} disabled={!intakeDeadlineEligible} onChange={(e) => setForm({ ...form, deadlinePresetDays: e.target.value })}>
              <option value="">NO DEADLINE</option>
              {presetRules.map((rule) => <option key={rule.code} value={rule.defaultDays}>{rule.defaultDays} DAYS</option>)}
            </select>
            <div className="muted-inline">{intakeDeadlineEligible ? "Deadline workflow available." : "Select CORRESPONDENCE or NOTICE to enable deadline creation."}</div>
          </div>
        </div>

        <div className="action-cluster">
          <button className="btn btn-primary" disabled={!canIntake || busy} onClick={handleSubmit}>{busy ? "PROCESSING…" : "ADD TO REPOSITORY"}</button>
          {!canIntake ? <span className="muted-inline">Current role does not permit intake.</span> : null}
        </div>
      </div>
    </section>
  );
}
