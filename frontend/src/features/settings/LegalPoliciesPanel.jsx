import { useMemo, useState } from "react";

const POLICY_SECTIONS = {
  terms: {
    label: "Terms of Service / EULA",
    eyebrow: "PLATFORM TERMS",
    title: "TERMS OF SERVICE / END USER LICENSE AGREEMENT",
    updated: "Effective upon publication in the governed Settings panel.",
    sections: [
      {
        heading: "1. Scope",
        paragraphs: [
          "These Terms govern access to and use of the AEGIS Governance, including its software, workflows, ledgers, repositories, packet builders, audit systems, and related administrative services.",
          "By accessing or using the Platform, each user agrees to be bound by these Terms and to use the Platform only for authorized trust-administration purposes.",
        ],
      },
      {
        heading: "2. Limited License",
        paragraphs: [
          "Authorized users receive a limited, revocable, non-exclusive, non-transferable license to use the Platform solely for lawful, internal, trust-governance and fiduciary-administration activities.",
          "No ownership interest in the Platform, its code, workflows, or governance systems is transferred by access or use.",
        ],
      },
      {
        heading: "3. Ownership and Control",
        paragraphs: [
          "The Platform, including its design, architecture, branding, repository structures, governance logic, and administrative outputs, remains subject to the lawful ownership and control of the AEGIS Governance and its authorized administrative office, to the extent applicable.",
          "Users may not reverse engineer, copy, distribute, or create unauthorized derivative works from the Platform.",
        ],
      },
      {
        heading: "4. Authorized Use",
        paragraphs: [
          "Users shall access the Platform only within the scope of delegated authority and only for trust governance, repository control, contacts, deadlines, notices, ledgering, administrative packets, and other approved fiduciary workflows.",
          "Use for unlawful conduct, deceptive records activity, credential sharing, or system interference is prohibited.",
        ],
      },
      {
        heading: "5. Accounts and Security",
        paragraphs: [
          "Users are responsible for safeguarding credentials, using strong passwords, and promptly reporting suspected unauthorized access or security incidents.",
          "The Platform may enforce password changes, session controls, role-based access restrictions, audit logging, and account suspension where required for security or governance integrity.",
        ],
      },
      {
        heading: "6. Records and Outputs",
        paragraphs: [
          "The Platform supports administrative organization and recordkeeping, but software outputs do not by themselves create legal standing, validate filings, perfect service, or guarantee enforceability.",
          "Users remain responsible for reviewing records, notices, and exports before external use in any legal, financial, administrative, or evidentiary setting.",
        ],
      },
      {
        heading: "7. Disclaimer of Warranties and Limitation of Liability",
        paragraphs: [
          "The Platform is provided on an 'as is' and 'as available' basis without warranties of merchantability, fitness for a particular purpose, legal sufficiency, or uninterrupted availability.",
          "To the maximum extent permitted by applicable law, the Trust, its administrative office, operators, and contributors are not liable for indirect, incidental, consequential, or punitive damages arising from platform use, misuse, outages, data loss, or reliance on outputs.",
        ],
      },
      {
        heading: "8. Suspension, Termination, and Modification",
        paragraphs: [
          "Access may be suspended, restricted, or terminated where necessary to preserve governance integrity, security, repository continuity, or lawful operation.",
          "These Terms may be updated from time to time. Continued use after an update constitutes acceptance of the revised Terms.",
        ],
      },
    ],
  },
  privacy: {
    label: "Privacy Policy",
    eyebrow: "INFORMATION PRACTICES",
    title: "PRIVACY POLICY",
    updated: "Applies to information processed through this governance platform.",
    sections: [
      {
        heading: "1. Information Collected",
        paragraphs: [
          "The Platform may collect account information, authentication metadata, uploaded documents, repository classifications, contact records, deadlines, notices, ledger entries, audit events, and other information necessary for trust administration.",
          "Technical and security data such as session identifiers, IP address, browser data, login events, and error logs may also be collected to maintain secure operation.",
        ],
      },
      {
        heading: "2. How Information Is Used",
        paragraphs: [
          "Information is used to authenticate users, administer trust records, support repository and governance workflows, generate reports and packets, monitor system integrity, and preserve administrative continuity.",
          "Information may also be used to investigate misuse, enforce permissions, and maintain evidentiary or audit traceability.",
        ],
      },
      {
        heading: "3. Files, Notices, and Records",
        paragraphs: [
          "Uploaded files and administrative records may be stored, indexed, linked to workflows, associated with ledgers or notices, and retained as part of the ongoing trust administration record.",
          "Users are responsible for ensuring that uploaded content is lawfully possessed and appropriate for inclusion in the Platform.",
        ],
      },
      {
        heading: "4. Sharing and Disclosure",
        paragraphs: [
          "Information is not sold. Information may be disclosed only as reasonably necessary to authorized fiduciaries, administrators, trusted service providers, legal counsel, or where required to protect security, preserve trust interests, or comply with lawful process.",
          "Only the minimum reasonably necessary information should be disclosed for such purposes.",
        ],
      },
      {
        heading: "5. Security and Retention",
        paragraphs: [
          "Reasonable technical and organizational safeguards may include access controls, role permissions, session controls, audit logs, transport security, and secure storage practices.",
          "Records may be retained for as long as reasonably necessary to support trust governance, repository continuity, audit preservation, legal hold, evidentiary use, and administrative accountability.",
        ],
      },
      {
        heading: "6. User Requests and Limits",
        paragraphs: [
          "Subject to applicable law and administrative policy, users may request access to or correction of certain account information.",
          "Requests to delete or alter records may be denied where necessary to preserve trust administration, audit integrity, legal hold, or repository continuity.",
        ],
      },
    ],
  },
  disclaimer: {
    label: "Disclaimer",
    eyebrow: "ADVISORY LIMITS",
    title: "DISCLAIMER OF LEGAL / TAX / FIDUCIARY ADVICE",
    updated: "This Platform is an administrative tool and not a substitute for professional advice.",
    sections: [
      {
        heading: "1. No Legal Advice",
        paragraphs: [
          "Nothing in the Platform, including notices, templates, packets, repository classifications, ledgers, or generated text, constitutes legal advice, legal representation, or an attorney-client relationship.",
          "Users are solely responsible for obtaining independent legal counsel where legal interpretation, filing, litigation, or enforceability is at issue.",
        ],
      },
      {
        heading: "2. No Tax Advice",
        paragraphs: [
          "Nothing in the Platform constitutes tax advice, tax planning, tax compliance guidance, or tax representation. Use of the Platform does not guarantee IRS acceptance, tax treatment, or tax reporting outcomes.",
          "Users are responsible for consulting qualified tax professionals where tax matters are implicated.",
        ],
      },
      {
        heading: "3. No Accounting or Financial Advice",
        paragraphs: [
          "Any accounting views, ledger displays, or distribution tracking are provided for administrative support only and do not replace independent accounting, bookkeeping, financial planning, or investment advice.",
          "Users remain responsible for verifying all financial records and classifications.",
        ],
      },
      {
        heading: "4. No Independent Fiduciary Role",
        paragraphs: [
          "The Platform does not act as a trustee, co-trustee, fiduciary, or independent decision-maker. It does not relieve any trustee, administrator, or representative of the duty to exercise independent judgment.",
          "All fiduciary actions remain the sole responsibility of the authorized human decision-maker.",
        ],
      },
      {
        heading: "5. No Guarantee of Effect",
        paragraphs: [
          "Use of the Platform does not by itself create a valid trust, perfect a filing, complete service, guarantee admissibility, prove mailing, or establish legal standing.",
          "The Platform assists with organization and preservation only; all downstream legal and administrative consequences remain the responsibility of the user.",
        ],
      },
    ],
  },
  acceptableUse: {
    label: "Acceptable Use Policy",
    eyebrow: "AUTHORIZED PLATFORM CONDUCT",
    title: "ACCEPTABLE USE POLICY",
    updated: "All use must remain lawful, authorized, and consistent with fiduciary administration.",
    sections: [
      {
        heading: "1. Permitted Use",
        paragraphs: [
          "The Platform may be used only for authorized trust governance, repository management, notices, contacts, deadlines, audits, controls, settings, integrations, and related internal administrative functions.",
          "All use must remain within the scope of the user’s role, delegated authority, and lawful purpose.",
        ],
      },
      {
        heading: "2. Prohibited Conduct",
        paragraphs: [
          "Users may not engage in fraud, falsification, impersonation, deceptive backdating, unauthorized legal practice, unlawful filing schemes, or any other unlawful conduct through or in connection with the Platform.",
          "Users may not bypass access controls, share credentials, tamper with logs, upload malicious files, disrupt availability, or otherwise interfere with secure operation.",
        ],
      },
      {
        heading: "3. Record and Template Misuse",
        paragraphs: [
          "Users may not fabricate records, conceal material history, misuse notices or packet builders, or employ platform-generated content to deceive, harass, or misrepresent status or authority.",
          "All records and administrative tools must be used in good faith and in a manner consistent with fiduciary accountability.",
        ],
      },
      {
        heading: "4. Confidentiality and Sensitive Information",
        paragraphs: [
          "Restricted trust records, credentials, notices, ledger entries, and internal administrative materials must not be disclosed outside authorized channels.",
          "Users must handle sensitive information in accordance with confidentiality obligations and administrative policy.",
        ],
      },
      {
        heading: "5. Enforcement",
        paragraphs: [
          "Violations may result in warnings, access restriction, suspension, termination, evidence preservation, administrative review, and referral to counsel or authorities where warranted.",
          "Use of the Platform is a limited privilege and may be revoked to preserve governance integrity, security, or lawful operation.",
        ],
      },
    ],
  },

  positioning: {
    label: "Platform Scope & Legal Positioning",
    eyebrow: "WORKFLOW SUPPORT VS LEGAL COMPLIANCE",
    title: "PLATFORM SCOPE & LEGAL POSITIONING POLICY",
    updated: "Separates software workflow support from legal compliance, legal sufficiency determinations, and legal adjudication.",
    sections: [
      {
        heading: "1. Platform Role",
        paragraphs: [
          "The Platform is an administrative workflow, repository, and evidentiary support system for trust governance. It is not a court, recorder, agency, tribunal, arbitrator, or legal authority.",
          "Its purpose is to organize records, sequence tasks, preserve chain-of-custody details, and support fiduciary administration through governed workflows.",
        ],
      },
      {
        heading: "2. Workflow Support vs. Legal Compliance",
        paragraphs: [
          "The Platform may help structure notices, deadlines, packet assembly, and repository controls. Those features are workflow support only.",
          "The Platform does not determine whether a notice, filing, service act, packet, or record is legally sufficient, compliant, enforceable, admissible, accepted by any authority, or dispositive of any legal dispute.",
        ],
      },
      {
        heading: "3. Jurisdictional Rule Packs",
        paragraphs: [
          "Jurisdiction-aware workflow hints, prompts, or rule packs are informational and non-authoritative. They are designed to help users organize tasks around common patterns, not to declare compliance.",
          "Any jurisdictional hints may be incomplete, outdated, or unsuitable for a particular court, agency, recorder, or fact pattern and must be independently verified by the user.",
        ],
      },
      {
        heading: "4. User Responsibility",
        paragraphs: [
          "Users remain solely responsible for validating venue, filing format, service method, timing, legal sufficiency, and substantive compliance before using any platform output externally.",
          "Where legal, tax, fiduciary, or administrative consequences matter, qualified human review remains required.",
        ],
      },
      {
        heading: "5. Evidentiary Support",
        paragraphs: [
          "The Platform can preserve timestamps, manifests, signatures, audit references, and immutable export bundles to support chain-of-custody and evidentiary organization.",
          "These features do not certify admissibility, authenticate truth, or determine evidentiary weight; those determinations remain with the relevant authority.",
        ],
      },
    ],
  },
  records: {
    label: "Records Integrity Policy",
    eyebrow: "ADMINISTRATIVE PRESERVATION",
    title: "RECORDS INTEGRITY & ADMINISTRATIVE PRESERVATION POLICY",
    updated: "Preserves a trustworthy, traceable, and reviewable administrative record.",
    sections: [
      {
        heading: "1. Covered Records",
        paragraphs: [
          "This Policy applies to governing instruments, trust documents, uploads, exhibits, notices, service records, ledger entries, accounting records, audit logs, deadlines, contacts, packet exports, workflow metadata, and other administrative artifacts maintained in the Platform.",
        ],
      },
      {
        heading: "2. Accuracy and Authorization",
        paragraphs: [
          "Records must be materially accurate to the best knowledge of the responsible user, entered through authorized workflows, and classified in a manner consistent with repository governance.",
          "Knowingly false, fabricated, misleading, or unauthorized records are prohibited.",
        ],
      },
      {
        heading: "3. Modification Controls",
        paragraphs: [
          "Where editing is permitted, changes must occur only through authorized processes. Users may not secretly alter records, overwrite history to conceal prior states, or manipulate chronology.",
          "Where supported, versioning, soft-delete, archive, and immutable-state controls should be used to preserve continuity and evidentiary reliability.",
        ],
      },
      {
        heading: "4. Auditability and Chain of Custody",
        paragraphs: [
          "The Platform may maintain logs and metadata that reflect creation, modification, approval, export, notice, service, and classification events. Users must not compromise these mechanisms.",
          "Administrative actions should preserve a coherent chain of custody for material records.",
        ],
      },
      {
        heading: "5. Preservation, Retention, and Export",
        paragraphs: [
          "Material records relevant to trust administration, distributions, notices, audits, disputes, or evidentiary use should not be destroyed, hidden, or altered in a way that undermines reviewability or trust continuity.",
          "Exports and packets must be reviewed before external use. The reliability of an export depends on the integrity of the underlying records.",
        ],
      },
      {
        heading: "6. Violations",
        paragraphs: [
          "Falsification, unauthorized deletion, repository misclassification, audit tampering, destructive backdating, or metadata manipulation may be treated as serious administrative and security violations.",
          "Such conduct may result in access restriction, investigation, preservation action, suspension, or legal escalation where appropriate.",
        ],
      },
    ],
  },
};

function PolicyDocument({ policy }) {
  return (
    <div className="premium-card legal-doc-panel">
      <div className="legal-doc-hero">
        <div>
          <div className="small-label">{policy.eyebrow}</div>
          <div className="large-title legal-doc-title">{policy.title}</div>
          <div className="hero-note legal-doc-note">{policy.updated}</div>
        </div>
      </div>

      <div className="legal-section-stack">
        {policy.sections.map((section) => (
          <section key={section.heading} className="legal-section-block">
            <h3 className="legal-section-title">{section.heading}</h3>
            {section.paragraphs.map((paragraph, index) => (
              <p key={`${section.heading}-${index}`} className="legal-paragraph">{paragraph}</p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

export function LegalPoliciesPanel() {
  const tabs = useMemo(
    () => [
      { key: "terms", label: POLICY_SECTIONS.terms.label },
      { key: "privacy", label: POLICY_SECTIONS.privacy.label },
      { key: "disclaimer", label: POLICY_SECTIONS.disclaimer.label },
      { key: "acceptableUse", label: POLICY_SECTIONS.acceptableUse.label },
      { key: "positioning", label: POLICY_SECTIONS.positioning.label },
      { key: "records", label: POLICY_SECTIONS.records.label },
    ],
    [],
  );
  const [activeKey, setActiveKey] = useState("terms");
  const activePolicy = POLICY_SECTIONS[activeKey];

  return (
    <div className="legal-shell">
      <div className="premium-card legal-nav-card">
        <div className="info-card-title">LEGAL &amp; POLICIES</div>
        <div className="info-card-text">Platform-level documents governing software use, privacy, advisories, acceptable conduct, and records preservation.</div>
        <div className="legal-tab-list">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`legal-tab-button ${activeKey === tab.key ? "legal-tab-button-active" : ""}`}
              onClick={() => setActiveKey(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <PolicyDocument policy={activePolicy} />
    </div>
  );
}
