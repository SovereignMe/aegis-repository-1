import type {
  AccountingEntryRecord,
  ApprovalRecord,
  AuditRecord,
  AuthorityChainRecord,
  BeneficiaryRecord,
  ContactRecord,
  DistributionRecord,
  DocumentRecord,
  ExhibitIndexRecord,
  GovernanceState,
  IntegrationRecord,
  NoticeRecord,
  PacketRecord,
  RefreshSession,
  TaskRecord,
  TenantRecord,
  TimerRecord,
  TrustLedgerEntryRecord,
  TrustLedgerRecord,
  TrustRecord,
  AppUser,
  GovernancePolicyVersionRecord,
} from "../../models/domain.js";

export interface StateCarrier {
  tenants: TenantRecord[];
  trusts: TrustRecord[];
  settings: Record<string, unknown>;
  deadlineRules: Array<Record<string, unknown>>;
  integrations: IntegrationRecord[];
  documents: DocumentRecord[];
  contacts: ContactRecord[];
  tasks: TaskRecord[];
  role: string;
  permissions: Record<string, unknown>;
  timers: TimerRecord[];
  audit: AuditRecord[];
  users: AppUser[];
  sessions: RefreshSession[];
  trustLedgers: TrustLedgerRecord[];
  exhibitIndex: ExhibitIndexRecord[];
  trustLedgerEntries: TrustLedgerEntryRecord[];
  accountingEntries: AccountingEntryRecord[];
  authorityChain: AuthorityChainRecord[];
  beneficiaries: BeneficiaryRecord[];
  distributions: DistributionRecord[];
  notices: NoticeRecord[];
  packets: PacketRecord[];
  approvals: ApprovalRecord[];
  policyVersions: GovernancePolicyVersionRecord[];
}

export function applyStateSlices(target: StateCarrier, state: GovernanceState) {
  target.tenants = state.tenants || [];
  target.trusts = state.trusts || [];
  target.settings = state.settings;
  target.deadlineRules = state.deadlineRules;
  target.integrations = state.integrations;
  target.documents = state.documents;
  target.contacts = state.contacts;
  target.tasks = state.tasks;
  target.role = state.role;
  target.permissions = state.permissions;
  target.timers = state.timers;
  target.audit = state.audit;
  target.users = state.users;
  target.sessions = state.sessions || [];
  target.trustLedgers = state.trustLedgers || [];
  target.exhibitIndex = state.exhibitIndex || [];
  target.trustLedgerEntries = state.trustLedgerEntries || [];
  target.accountingEntries = state.accountingEntries || [];
  target.authorityChain = state.authorityChain || [];
  target.beneficiaries = state.beneficiaries || [];
  target.distributions = state.distributions || [];
  target.notices = state.notices || [];
  target.packets = state.packets || [];
  target.approvals = state.approvals || [];
  target.policyVersions = state.policyVersions || [];
}

export function exportStateSlices(source: StateCarrier): GovernanceState {
  return {
    tenants: source.tenants,
    trusts: source.trusts,
    settings: source.settings,
    deadlineRules: source.deadlineRules,
    integrations: source.integrations,
    documents: source.documents,
    contacts: source.contacts,
    tasks: source.tasks,
    role: source.role,
    permissions: source.permissions,
    timers: source.timers,
    audit: source.audit,
    users: source.users,
    sessions: source.sessions,
    trustLedgers: source.trustLedgers,
    exhibitIndex: source.exhibitIndex,
    trustLedgerEntries: source.trustLedgerEntries,
    accountingEntries: source.accountingEntries,
    authorityChain: source.authorityChain,
    beneficiaries: source.beneficiaries,
    distributions: source.distributions,
    notices: source.notices,
    packets: source.packets,
    approvals: source.approvals,
    policyVersions: source.policyVersions,
  };
}
