import { useState } from "react";

const STATUS_OPTIONS = ["TRUSTEE", "BENEFICIARY", "COUNSEL", "VENDOR", "COURT", "ADMINISTRATIVE CONTACTS"];
const US_STATE_OPTIONS = [
  "", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];
const COUNTRY_OPTIONS = ["", "United States", "Canada", "Mexico", "United Kingdom", "Italy", "Spain", "France", "Germany", "Jamaica", "Cayman Islands", "Costa Rica", "Belize", "Bahamas", "Other"];
const EMPTY_FORM = {
  fullName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  status: "ADMINISTRATIVE CONTACTS",
  organization: "",
  email: "",
  phone: "",
  faxNumber: "",
  country: "United States",
};

const LEFT_COLUMN_FIELDS = [
  { key: "fullName", label: "FULL NAME", type: "text" },
  { key: "addressLine1", label: "ADDRESS LINE 1", type: "text" },
  { key: "addressLine2", label: "ADDRESS LINE 2", type: "text" },
  { key: "city", label: "CITY", type: "text" },
  { key: "state", label: "STATE / REGION", type: "select", options: US_STATE_OPTIONS },
  { key: "postalCode", label: "POSTAL CODE", type: "text" },
];

const RIGHT_COLUMN_FIELDS = [
  { key: "status", label: "STATUS", type: "select", options: STATUS_OPTIONS },
  { key: "organization", label: "ORGANIZATION", type: "text" },
  { key: "email", label: "EMAIL", type: "email" },
  { key: "phone", label: "PHONE", type: "tel" },
  { key: "faxNumber", label: "FAX NUMBER", type: "text" },
  { key: "country", label: "COUNTRY", type: "select", options: COUNTRY_OPTIONS },
];

function renderField(field, form, setForm) {
  if (field.type === "select") {
    return (
      <select className="form-input" value={form[field.key]} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}>
        {field.options.map((option) => (
          <option key={option || "blank"} value={option}>{option || `SELECT ${field.label}`}</option>
        ))}
      </select>
    );
  }
  return <input className="form-input" type={field.type} placeholder={field.label} value={form[field.key]} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} />;
}

export function ContactsPanel({ contacts, onSave, canSave }) {
  const [form, setForm] = useState(EMPTY_FORM);

  return (
    <section className="single-panel premium-surface">
      <div className="module-header">
        <div>
          <div className="small-label">PARTY DIRECTORY</div>
          <div className="large-title">CONTACTS</div>
          <div className="large-sub">TRUSTEE, BENEFICIARY, COUNSEL, VENDOR, COURT, AND ADMINISTRATIVE CONTACTS</div>
        </div>
        <div className="module-callout"><div className="small-label">DIRECTORY COUNT</div><div className="callout-title">{contacts.length}</div><div className="callout-copy">Each saved contact is ready for notice, calendaring, and communication linkage.</div></div>
        {!canSave ? <div className="muted-inline">Current role cannot write contact records.</div> : null}
      </div>

      <div className="module-form-shell">
        <div className="contacts-two-column-grid">
          <div className="contacts-column-card">
            <div className="small-label">COLUMN 1</div>
            <div className="contacts-column-stack">
              {LEFT_COLUMN_FIELDS.map((field) => (
                <div key={field.key}>
                  <div className="muted-inline" style={{ marginBottom: 8 }}>{field.label}</div>
                  {renderField(field, form, setForm)}
                </div>
              ))}
            </div>
          </div>
          <div className="contacts-column-card">
            <div className="small-label">COLUMN 2</div>
            <div className="contacts-column-stack">
              {RIGHT_COLUMN_FIELDS.map((field) => (
                <div key={field.key}>
                  <div className="muted-inline" style={{ marginBottom: 8 }}>{field.label}</div>
                  {renderField(field, form, setForm)}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="action-cluster"><button className="btn btn-primary" disabled={!canSave} onClick={() => { onSave(form); setForm(EMPTY_FORM); }}>SAVE CONTACT</button></div>
      </div>

      <div className="stack card-stack-space">
        {contacts.map((contact) => (
          <div className="repo-card premium-list-card" key={contact.id}>
            <div className="repo-card-top">
              <div>
                <div className="repo-title">{contact.fullName}</div>
                <div className="repo-id">{(contact.status || "ADMINISTRATIVE CONTACTS").toUpperCase()} • {contact.organization || "NO ORGANIZATION"}</div>
                {(contact.addressLine1 || contact.city || contact.state || contact.postalCode || contact.country) ? <div className="muted-inline" style={{ marginTop: 8 }}>{[contact.addressLine1, contact.addressLine2, [contact.city, contact.state, contact.postalCode].filter(Boolean).join(", "), contact.country].filter(Boolean).join(" · ")}</div> : null}
              </div>
              <div className="tag-row">{contact.email ? <span className="tag">{contact.email}</span> : null}{contact.phone ? <span className="tag">{contact.phone}</span> : null}{contact.faxNumber ? <span className="tag">FAX {contact.faxNumber}</span> : null}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
