import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { GovernancePanelProps, GovernanceWorkspacePagePayload } from '../../models/types';
import { getJurisdictionHintPack } from '../../utils/jurisdictionHints';
import { GovernancePolicySection } from './components/GovernancePolicySection';
import { GovernanceComplianceCards, GovernanceSummaryCards } from './components/GovernanceSummaryCards';
import { VerificationWorkflowPanel } from './components/VerificationWorkflowPanel';
import { GOVERNANCE_WORKSPACE_PAGES, resolveGovernancePageKey, type GovernanceWorkspacePageKey } from './governanceWorkspaceConfig';
import { governanceService } from '../../services/governanceService';
import AegisIcon from '../../assets/aegis/aegis-logo1.webp';

function formatStatus(value?: string | null) {
  return String(value || 'pending').replace(/[_-]/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function shortDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function countByStatus(items: Array<Record<string, any>>, statuses: string[]) {
  const set = new Set(statuses);
  return items.filter((item) => set.has(String(item.status || '').toLowerCase())).length;
}

function GovernanceMetric({ label, value, tone = 'default', onClick, active = false }: { label: string; value: string | number; tone?: 'default' | 'ok' | 'warn' | 'info'; onClick?: () => void; active?: boolean }) {
  return (
    <button type="button" className={`governance-meta-card governance-tone-${tone} ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="governance-meta-label">{label}</div>
      <div className="governance-meta-value">{value}</div>
    </button>
  );
}

function GovernancePageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="governance-page-header premium-surface">
      <div>
        <div className="small-label">{eyebrow}</div>
        <div className="large-title governance-page-title">{title}</div>
        <div className="muted-inline governance-page-subtitle">{description}</div>
      </div>
      {actions ? <div className="governance-page-actions">{actions}</div> : null}
    </div>
  );
}

function WorkspacePageNav({ activePage, onSelect }: { activePage: GovernanceWorkspacePageKey; onSelect: (page: GovernanceWorkspacePageKey) => void }) {
  return (
    <aside className="governance-workspace-nav premium-surface">
      <div className="small-label">AEGIS Governance</div>
      <div className="muted-inline" style={{ marginTop: 6, marginBottom: 12 }}></div>
      {[1, 2].map((tier) => (
        <div key={tier} className="governance-workspace-nav-tier">
          <div className="governance-workspace-nav-tier-label">Tier {tier}</div>
          <div className="governance-workspace-nav-list">
            {GOVERNANCE_WORKSPACE_PAGES.filter((page) => page.tier === tier).map((page) => (
              <button
                key={page.key}
                type="button"
                className={`governance-workspace-nav-item ${activePage === page.key ? 'active' : ''}`}
                onClick={() => onSelect(page.key)}
              >
                <span>{page.label}</span>
                <small>{page.description}</small>
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}

function GovernanceTable({ columns, rows, emptyMessage = 'No governed items available.' }: { columns: string[]; rows: ReactNode[][]; emptyMessage?: string }) {
  return (
    <div className="table-shell governance-table-shell premium-surface">
      <table className="data-table governance-data-table">
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`cell-${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>
          )) : (
            <tr><td colSpan={columns.length} className="governance-empty-row">{emptyMessage}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function GovernanceInfoCard({ title, description, children, tone = 'default' }: { title: string; description?: string; children: ReactNode; tone?: 'default' | 'warn' | 'danger' }) {
  return (
    <div className={`governance-rail-card premium-surface ${tone !== 'default' ? tone : ''}`}>
      <div className="small-label">{title}</div>
      {description ? <div className="muted-inline" style={{ marginBottom: 10 }}>{description}</div> : null}
      {children}
    </div>
  );
}

function GovernanceQuickForm({ title, fields, onSubmit, submitLabel, disabled }: { title: string; fields: ReactNode; onSubmit: () => void; submitLabel: string; disabled?: boolean }) {
  return (
    <div className="premium-surface governance-quick-form">
      <div className="small-label">{title}</div>
      <div className="governance-form-stack">{fields}</div>
      <button type="button" className="btn btn-primary" disabled={disabled} onClick={onSubmit}>{submitLabel}</button>
    </div>
  );
}

export function GovernancePanel({ settings, overview, artifacts, documents, canWrite, canDistribute, canNotice, canPacket, onCreateBeneficiary, onRequestDistribution, onApproveDistribution, onCreateNotice, onServeNotice, onBuildPacket, onCreatePolicyVersion, onActivatePolicyVersion }: GovernancePanelProps) {
  const [activePage, setActivePage] = useState<GovernanceWorkspacePageKey>(() => {
    if (typeof window === 'undefined') return 'overview';
    return resolveGovernancePageKey(window.location.hash.replace(/^#governance\/?/, '').split('/')[0]);
  });
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [noticeSubject, setNoticeSubject] = useState('Administrative Notice');
  const [distributionPurpose, setDistributionPurpose] = useState('BENEFICIARY_SUPPORT');
  const [distributionAmount, setDistributionAmount] = useState('2500');
  const [packetTitle, setPacketTitle] = useState('Governance Packet');
  const [workspacePages, setWorkspacePages] = useState<Record<string, GovernanceWorkspacePagePayload>>({});

  useEffect(() => {
    if (activePage === 'overview') return;
    let cancelled = false;
    governanceService.getWorkspacePage(activePage)
      .then((payload) => { if (!cancelled) setWorkspacePages((current) => ({ ...current, [activePage]: payload })); })
      .catch(() => { if (!cancelled) setWorkspacePages((current) => ({ ...current, [activePage]: { page: activePage } })); });
    return () => { cancelled = true; };
  }, [activePage]);

  const workspacePage = workspacePages[activePage] || null;
  const beneficiaries = (workspacePages['beneficiaries']?.beneficiaries || workspacePage?.beneficiaries || artifacts?.beneficiaries || []) as Array<Record<string, any>>;
  const distributions = (workspacePages['approvals']?.distributions || workspacePages['beneficiaries']?.distributions || workspacePage?.distributions || artifacts?.distributions || []) as Array<Record<string, any>>;
  const notices = (workspacePages['notices']?.notices || workspacePage?.notices || artifacts?.notices || []) as Array<Record<string, any>>;
  const packets = (workspacePages['packets']?.packets || workspacePages['approvals']?.packets || workspacePage?.packets || artifacts?.packets || []) as Array<Record<string, any>>;
  const policyVersions = (workspacePages['policies']?.policyVersions || workspacePage?.policyVersions || artifacts?.policyVersions || artifacts?.policyGovernance?.versions || []) as Array<Record<string, any>>;
  const trustLedgerEntries = (workspacePages['ledgers']?.ledgerEntries || workspacePage?.ledgerEntries || artifacts?.trustLedgerEntries || []) as Array<Record<string, any>>;
  const administrativeDocuments = (workspacePages['administrative-records']?.records || workspacePage?.records || documents || []) as Array<Record<string, any>>;
  const verificationIssues = (workspacePages['verification']?.issues || workspacePage?.issues || []) as Array<Record<string, any>>;
  const authorityChainItems = (workspacePages['administrative-records']?.authorityChain || workspacePages['policies']?.authorityChain || workspacePage?.authorityChain || []) as Array<Record<string, any>>;
  const compliance = overview?.complianceEngine || null;
  const openIssues = compliance?.issues || [];
  const pendingNotices = countByStatus(notices as Array<Record<string, any>>, ['draft', 'issued', 'pending_service', 'returned', 'disputed']);
  const servedNotices = countByStatus(notices as Array<Record<string, any>>, ['served', 'closed']);
  const pendingApprovals = countByStatus(distributions as Array<Record<string, any>>, ['requested', 'pending_approval']) + countByStatus(packets as Array<Record<string, any>>, ['assembling', 'ready_for_approval', 'approval_in_progress']);
  const pendingReconciliation = countByStatus(distributions as Array<Record<string, any>>, ['approved']);
  const latestPacket = packets[0] || null;
  const hintPack = useMemo(
    () => getJurisdictionHintPack(settings?.trust?.jurisdiction || overview?.controllingDocument?.jurisdiction, settings?.trust?.trustName),
    [settings, overview],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash.startsWith('governance')) return;
      const nextPage = resolveGovernancePageKey(hash.replace(/^governance\/?/, '').split('/')[0]);
      setActivePage(nextPage);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigatePage = (page: GovernanceWorkspacePageKey) => {
    setActivePage(page);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#governance/${page}`);
    }
  };

  const pageTitle = GOVERNANCE_WORKSPACE_PAGES.find((page) => page.key === activePage)?.label || 'Overview';

  const metricCards = [
    { label: 'Trust', value: settings?.trust?.trustName || 'HLH FUTURE INVESTMENT TRUST', page: 'administrative-records' as GovernanceWorkspacePageKey },
    { label: 'AEGIS Packet Readiness', value: openIssues.length ? 'Deficiency' : 'Ready', tone: openIssues.length ? 'warn' as const : 'ok' as const, page: 'packets' as GovernanceWorkspacePageKey },
    { label: 'Notices Pending', value: pendingNotices, tone: pendingNotices ? 'warn' as const : 'default' as const, page: 'notices' as GovernanceWorkspacePageKey },
    { label: 'Approvals Open', value: pendingApprovals, tone: pendingApprovals ? 'warn' as const : 'default' as const, page: 'approvals' as GovernanceWorkspacePageKey },
    { label: 'Verification', value: compliance?.status || 'Verified', tone: 'info' as const, page: 'verification' as GovernanceWorkspacePageKey },
    { label: 'Latest Packet', value: latestPacket?.displayId || latestPacket?.packetNumber || latestPacket?.id || 'Pending', page: 'packets' as GovernanceWorkspacePageKey },
  ];

  const administrativeRows = administrativeDocuments.slice(0, 20).map((document) => [
    document.displayId || document.id || '—',
    document.title || 'Untitled record',
    formatStatus(document.status),
    document.exhibitCode || 'Unassigned',
    shortDate(document.updatedAt || document.effectiveDate || document.createdAt),
  ]);

  const noticeRows = notices.map((notice: Record<string, any>) => [
    notice.noticeCode || notice.noticeNumber || notice.id || '—',
    notice.subject || notice.title || 'Untitled notice',
    formatStatus(notice.status),
    notice.serviceMethod || notice.method || 'Pending method',
    shortDate(notice.updatedAt || notice.servedAt || notice.issuedDate || notice.createdAt),
  ]);

  const beneficiaryRows = beneficiaries.map((beneficiary: Record<string, any>) => [
    beneficiary.beneficiaryCode || beneficiary.beneficiaryNumber || beneficiary.id || '—',
    beneficiary.fullName || beneficiary.displayName || 'Unnamed beneficiary',
    beneficiary.beneficiaryClass || beneficiary.beneficiaryType || 'General',
    formatStatus(beneficiary.status),
    beneficiary.allocationPercent != null ? `${beneficiary.allocationPercent}%` : '—',
  ]);

  const ledgerRows = trustLedgerEntries.map((entry: Record<string, any>) => [
    entry.entryCode || entry.id || '—',
    entry.title || entry.description || 'Ledger entry',
    entry.ledgerCode || entry.ledgerId || 'Ledger',
    formatStatus(entry.status || entry.entryType),
    shortDate(entry.postedAt || entry.updatedAt || entry.createdAt),
  ]);

  const packetRows = packets.map((packet: Record<string, any>) => [
    packet.displayId || packet.packetNumber || packet.id || '—',
    packet.title || packet.subject || 'Governance packet',
    formatStatus(packet.status),
    packet.manifestHash ? String(packet.manifestHash).slice(0, 12) : 'Pending',
    shortDate(packet.updatedAt || packet.createdAt),
  ]);

  const approvalRows = [
    ...distributions.filter((distribution: Record<string, any>) => ['requested', 'pending_approval'].includes(String(distribution.status || '').toLowerCase())).map((distribution: Record<string, any>) => [
      distribution.requestCode || distribution.id || '—',
      'Distribution',
      distribution.purpose || distribution.reasonCode || 'General support',
      formatStatus(distribution.status),
      distribution.amount ? `$${distribution.amount}` : '—',
    ]),
    ...packets.filter((packet: Record<string, any>) => ['assembling', 'ready_for_approval', 'approval_in_progress'].includes(String(packet.status || '').toLowerCase())).map((packet: Record<string, any>) => [
      packet.displayId || packet.id || '—',
      'Packet',
      packet.title || 'Governance packet',
      formatStatus(packet.status),
      packet.requiredApprovals || settings?.approvals?.policy?.packetRequiredApprovals || 2,
    ]),
  ];

  const verificationRows = (verificationIssues.length ? verificationIssues : openIssues).map((issue) => [
    formatStatus(issue.severity),
    issue.area || 'Governance engine',
    issue.message,
  ]);

  const authorityChain = authorityChainItems.length
    ? authorityChainItems.map((item: Record<string, any>) => item.title || item.displayId || item.documentId || item.id || 'Authority item')
    : [
        overview?.controllingDocument?.title || 'Trust Indenture & Ratification Declaration',
        'Supplemental Certification / Security Agreement / Supporting Administrative Instruments',
        `Jurisdiction hint pack: ${hintPack.label}`,
      ];

  const renderPage = () => {
    if (activePage === 'overview') {
      return (
        <>
          <GovernanceSummaryCards overview={overview} servedCount={servedNotices} />
          <GovernanceComplianceCards compliance={compliance} overview={overview} settings={settings} />
          <div className="governance-two-column">
            <GovernanceInfoCard title="AEGIS Readiness Alerts" description="Immediate exceptions requiring operator attention." tone={openIssues.length ? 'warn' : 'default'}>
              <div className="governance-list-stack compact">
                {(openIssues.length ? openIssues : [{ message: 'No open governance deficiencies detected.', area: 'Readiness', severity: 'ok' }]).map((issue, index) => (
                  <div key={`${issue.message}-${index}`} className="governance-list-item compact">
                    <div className="small-label">{formatStatus(issue.severity)}</div>
                    <div>{issue.message}</div>
                  </div>
                ))}
              </div>
            </GovernanceInfoCard>
            <GovernanceInfoCard title="AEGIS Activity" description="Top governed artifacts across record, notice, and packet workflows.">
              <div className="governance-list-stack compact">
                {[...(documents || []).slice(0, 2), ...notices.slice(0, 2), ...packets.slice(0, 2)].map((item: Record<string, any>, index) => (
                  <div key={`${item.id || index}`} className="governance-list-item compact">
                    <div>{item.title || item.subject || item.displayId || item.id}</div>
                    <strong>{formatStatus(item.status || 'active')}</strong>
                  </div>
                ))}
              </div>
            </GovernanceInfoCard>
          </div>
        </>
      );
    }

    if (activePage === 'administrative-records') {
      return (
        <>
          <GovernancePageHeader
            eyebrow="AEGIS Registry"
            title="Administrative Record Index / Authority / Exhibits"
            description="Repository documents are treated as administrative records here, with exhibit visibility and authority linkage before packet assembly."
          />
          <div className="governance-two-column">
            <GovernanceTable columns={['Record ID', 'Title', 'Status', 'Exhibit', 'Updated']} rows={administrativeRows} emptyMessage="No administrative records are currently indexed." />
            <div className="governance-stack-column">
              <GovernanceInfoCard title="AEGIS Authority Chain" description="Controlling hierarchy supporting current record actions.">
                <div className="governance-list-stack compact">
                  {authorityChain.map((item) => <div key={item} className="governance-list-item compact">{item}</div>)}
                </div>
              </GovernanceInfoCard>
              <GovernanceInfoCard title="AEGIS Exhibit Register" description="Current repository linkage visible to governance operators.">
                <div className="governance-list-stack compact">
                  {administrativeDocuments.slice(0, 8).map((document) => (
                    <div key={document.id} className="governance-list-item compact">
                      <div>{document.displayId || document.id}</div>
                      <strong>{document.exhibitCode || 'Unassigned exhibit'}</strong>
                    </div>
                  ))}
                </div>
              </GovernanceInfoCard>
            </div>
          </div>
        </>
      );
    }

    if (activePage === 'notices') {
      return (
        <>
          <GovernancePageHeader
            eyebrow="AEGIS Service"
            title="Issue / Serve / Cure / Close"
            description="Notice lifecycle with proof-of-service visibility and quick operator actions."
            actions={
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!canNotice || !notices.length}
                onClick={() => notices[0]?.id && onServeNotice(notices[0].id, { serviceMethod: 'certified_mail' })}
              >
                Mark Latest Notice Served
              </button>
            }
          />
          <div className="governance-two-column">
            <GovernanceTable columns={['Notice ID', 'Subject', 'Status', 'Service', 'Updated']} rows={noticeRows} emptyMessage="No notices are queued." />
            <GovernanceQuickForm
              title="Create Notice"
              disabled={!canNotice}
              submitLabel="Create Notice"
              onSubmit={() => onCreateNotice({ subject: noticeSubject, noticeType: 'administrative', status: 'draft' })}
              fields={(
                <>
                  <input className="form-input" value={noticeSubject} onChange={(event) => setNoticeSubject(event.target.value)} placeholder="Notice subject" />
                  <div className="muted-inline">A fresh administrative notice is drafted into the governed queue and can then be served from this page.</div>
                </>
              )}
            />
          </div>
        </>
      );
    }

    if (activePage === 'beneficiaries') {
      return (
        <>
          <GovernancePageHeader
            eyebrow="Beneficiaries"
            title="Profiles / Class / Standing"
            description="Beneficiary records, status, and connected trust actions."
          />
          <div className="governance-two-column">
            <GovernanceTable columns={['Beneficiary', 'Name', 'Class', 'Status', 'Allocation']} rows={beneficiaryRows} emptyMessage="No beneficiary records available." />
            <GovernanceQuickForm
              title="Create Beneficiary"
              disabled={!canWrite}
              submitLabel="Add Beneficiary"
              onSubmit={() => {
                if (!beneficiaryName.trim()) return;
                onCreateBeneficiary({ fullName: beneficiaryName, beneficiaryType: 'individual', status: 'active' });
                setBeneficiaryName('');
              }}
              fields={(
                <>
                  <input className="form-input" value={beneficiaryName} onChange={(event) => setBeneficiaryName(event.target.value)} placeholder="Beneficiary full name" />
                  <div className="muted-inline">New beneficiary records default to an active individual profile and remain visible for notice and distribution linkage.</div>
                </>
              )}
            />
          </div>
        </>
      );
    }

    if (activePage === 'ledgers') {
      return (
        <>
          <GovernancePageHeader
            eyebrow="AEGIS Ledger"
            title="Journal / Reconcile / Preserve"
            description="Master trust ledger support, accounting visibility, and distribution reconciliation triage."
            actions={
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!canDistribute || !distributions.length}
                onClick={() => distributions[0]?.id && onApproveDistribution(distributions[0].id, { approved: true })}
              >
                Approve Oldest Distribution
              </button>
            }
          />
          <GovernanceSummaryCards overview={overview} servedCount={servedNotices} />
          <div className="governance-two-column">
            <GovernanceTable columns={['Entry', 'Title', 'Ledger', 'State', 'Posted']} rows={ledgerRows} emptyMessage="No ledger entries available." />
            <GovernanceQuickForm
              title="Request Distribution"
              disabled={!canDistribute}
              submitLabel="Request Distribution"
              onSubmit={() => onRequestDistribution({ amount: distributionAmount, purpose: distributionPurpose, status: 'requested' })}
              fields={(
                <>
                  <input className="form-input" value={distributionAmount} onChange={(event) => setDistributionAmount(event.target.value)} placeholder="Amount" />
                  <select className="form-input" value={distributionPurpose} onChange={(event) => setDistributionPurpose(event.target.value)}>
                    {(settings?.approvals?.reasonCodes || ['BENEFICIARY_SUPPORT', 'ADMIN_RECORD', 'EVIDENCE_EXPORT', 'OTHER']).map((code) => <option key={code} value={code}>{code}</option>)}
                  </select>
                  <div className="muted-inline">Use this operator shortcut when a governed distribution request should be pushed into approval workflow.</div>
                </>
              )}
            />
          </div>
        </>
      );
    }

    if (activePage === 'packets') {
      return (
        <>
          <GovernancePageHeader
            eyebrow="AEGIS Packet"
            title="Assemble / Validate / Seal"
            description="Bundle governed records, notices, and linked items into an exportable packet."
          />
          <div className="governance-two-column">
            <GovernanceTable columns={['Packet', 'Title', 'Status', 'Manifest', 'Updated']} rows={packetRows} emptyMessage="No governance packets have been created." />
            <GovernanceQuickForm
              title="Build Packet"
              disabled={!canPacket}
              submitLabel="Create Packet"
              onSubmit={() => onBuildPacket({ title: packetTitle, includedDocumentIds: (documents || []).slice(0, 3).map((document) => document.id) })}
              fields={(
                <>
                  <input className="form-input" value={packetTitle} onChange={(event) => setPacketTitle(event.target.value)} placeholder="Packet title" />
                  <div className="muted-inline">The current shortcut builds a packet from the first governed records already present in the repository.</div>
                </>
              )}
            />
          </div>
        </>
      );
    }

    if (activePage === 'approvals') {
      return (
        <>
          <GovernancePageHeader
            eyebrow="AEGIS Authority"
            title="Maker / Checker Workflow"
            description="Approval queue for distributions and packets, governed by threshold and role rules."
          />
          <div className="governance-two-column">
            <GovernanceTable columns={['Reference', 'Entity', 'Summary', 'Status', 'Threshold']} rows={approvalRows} emptyMessage="No governed approvals are pending." />
            <GovernanceInfoCard title="Approval Policy" description="Thresholds currently applied by the governance settings store.">
              <div className="governance-list-stack compact">
                <div className="governance-list-item compact"><div>Maker-checker</div><strong>{settings?.approvals?.policy?.makerChecker ? 'Enabled' : 'Disabled'}</strong></div>
                <div className="governance-list-item compact"><div>Packet approvals</div><strong>{settings?.approvals?.policy?.packetRequiredApprovals || 2}</strong></div>
                <div className="governance-list-item compact"><div>Distribution threshold</div><strong>${settings?.approvals?.policy?.distributionThresholdAmount || 5000}</strong></div>
                <div className="governance-list-item compact"><div>Threshold approvals</div><strong>{settings?.approvals?.policy?.distributionThresholdApprovals || 2}</strong></div>
              </div>
            </GovernanceInfoCard>
          </div>
        </>
      );
    }

    if (activePage === 'policies') {
      return (
        <>
          <GovernancePageHeader
            eyebrow="Policies & Authority"
            title="Governing Basis"
            description="Versioned trust policy templates, approval thresholds, and authority support materials."
          />
          <GovernancePolicySection overview={{ ...(overview || {}), policyGovernance: (workspacePages['policies']?.policyGovernance || artifacts?.policyGovernance || overview?.policyGovernance) }} policies={{ versions: policyVersions }} canWrite={canWrite} onCreatePolicyVersion={onCreatePolicyVersion} onActivatePolicyVersion={onActivatePolicyVersion} />
        </>
      );
    }

    return (
      <>
        <GovernancePageHeader
          eyebrow="AEGIS Verify"
          title="Integrity / Deficiencies / Preservation"
          description="Compliance engine results, signature readiness, and audit-oriented exception review."
        />
        <div className="governance-two-column">
          <GovernanceTable columns={['Severity', 'Area', 'Issue']} rows={verificationRows} emptyMessage="No active verification exceptions found." />
          <GovernanceInfoCard title="AEGIS Verification Boundary" description="Operational scope of the governance workspace.">
            <div className="governance-list-stack compact">
              <div className="governance-list-item compact"><div>Support mode</div><strong>{settings?.platformBoundary?.mode || 'administrative-governance-and-evidence-control'}</strong></div>
              <div className="governance-list-item compact"><div>Legal adjudication</div><strong>{settings?.platformBoundary?.legalAdjudicationEnabled ? 'Enabled' : 'Disabled'}</strong></div>
              <div className="governance-list-item compact"><div>Immutable archive</div><strong>{settings?.recordsGovernance?.immutableArchiveTier || 'immutable-worm'}</strong></div>
              <div className="governance-list-item compact"><div>Policy versions</div><strong>{policyVersions.length}</strong></div>
            </div>
          </GovernanceInfoCard>
        </div>
        <VerificationWorkflowPanel
          verificationStatus={openIssues.length ? 'Attention Required' : 'Verified'}
          anchorStatus={(artifacts as any)?.packetLifecycle?.latestAnchorStatus || 'Pending'}
          signatureStatus={(artifacts as any)?.packetLifecycle?.latestSignatureStatus || 'Ready'}
          artifactCount={Number(artifacts?.generatedPackets || 0)}
          openIssues={verificationRows.map((row) => ({ severity: row[0], area: row[1], issue: row[2] }))}
        />
      </>
    );
  };

  return (
    <section className="single-panel governance-workspace-shell premium-surface fade-in delay-3">
      <div className="governance-hero-shell">
        <div>
          <div className="small-label">MASTER GOVERNANCE DOCKET</div>
          <div className="large-title">GOVERNANCE CENTRAL</div>
          <div className="large-sub governance-hero-positioning">Governed operational control across the active administrative record.</div>
          <div className="governance-hero-scope">For notices, beneficiaries, ledgers, packets, approvals, policy authority, and verification.</div>
        </div>
      </div>

      <div className="governance-current-action premium-surface">
        <div className="governance-current-action-header">
          <div>
            <div className="small-label">CURRENT PAGE OVERVIEW</div>
            <div className="large-title" style={{ fontSize: 24 }}>{pageTitle}</div>
            <div className="muted-inline">{GOVERNANCE_WORKSPACE_PAGES.find((page) => page.key === activePage)?.description}</div>
          </div>
          <div className={`governance-status-badge ${openIssues.length ? 'warn' : 'ok'}`}>{openIssues.length ? `${openIssues.length} deficiencies require review` : 'Readiness clear'}</div>
        </div>
        <div className="governance-current-action-metrics">
          {metricCards.map((card) => <GovernanceMetric key={card.label} label={card.label} value={card.value} tone={card.tone} active={activePage === card.page} onClick={() => navigatePage(card.page)} />)}
        </div>
      </div>

      <div className="governance-workspace-grid">
        <WorkspacePageNav activePage={activePage} onSelect={navigatePage} />
        <div className="governance-workspace-page">{renderPage()}</div>
      </div>
    </section>
  );
}
