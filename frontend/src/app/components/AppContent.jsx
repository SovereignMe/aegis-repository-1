import { ContactsPanel } from "../../features/contacts/ContactsPanel";
import { TasksPanel } from "../../features/tasks/TasksPanel";
import { SettingsPanel } from "../../features/settings/SettingsPanel";
import { IntegrationsPanel } from "../../features/integrations/IntegrationsPanel";
import { RepositoryPanel } from "../../features/repository/RepositoryPanel";
import { IntakePanel } from "../../features/repository/IntakePanel";
import { ControlsPanel } from "../../features/repository/ControlsPanel";
import { AuditPanel } from "../../features/repository/AuditPanel";
import { GovernancePanel } from "../../features/governance/GovernancePanel";

export function AppContent({ activeTab, store }) {
  const resolvedSettings = store.settings?.values || store.settings;

  switch (activeTab) {
    case "repository":
      return <RepositoryPanel settings={resolvedSettings} documents={store.documents} onArchive={store.archiveDocument} canArchive={store.can("documents.archive")} />;
    case "intake":
      return <IntakePanel settings={resolvedSettings} onCreate={store.createDocument} canIntake={store.can("intake.create")} deadlineRules={store.deadlineRules} />;
    case "deadlines":
      return <TasksPanel deadlineRules={store.deadlineRules} tasks={store.tasks} onCreate={store.createTask} onComplete={store.completeTask} canCreate={store.can("tasks.create")} canComplete={store.can("tasks.complete")} />;
    case "contacts":
      return <ContactsPanel contacts={store.contacts} onSave={store.saveContact} canSave={store.can("contacts.write")} />;
    case "integrations":
      return <IntegrationsPanel integrations={store.integrations} onMarkSync={store.markIntegrationSync} canSync={store.can("integrations.sync")} />;
    case "controls":
      return <ControlsPanel role={store.role} currentUser={store.currentUser} users={store.users} permissions={store.permissions} onPermissionsChange={store.savePermissions} onCreateUser={store.createManagedUser} canEditPermissions={store.can("controls.permissions")} canManageUsers={store.can("controls.role")} />;
    case "settings":
      return <SettingsPanel settings={resolvedSettings} onSave={store.saveSettings} canSave={store.can("settings.write")} />;
    case "governance":
      return <GovernancePanel settings={resolvedSettings} overview={store.governanceOverview} artifacts={store.governanceArtifacts} documents={store.documents} canWrite={store.can("beneficiaries.write")} canReadBeneficiaries={store.can("beneficiaries.read")} canReadDistributions={store.can("distributions.read")} canDistribute={store.can("distributions.approve")} canNotice={store.can("notices.write")} canReadNotices={store.can("notices.read")} canReadAccounting={store.can("accounting.read")} canPacket={store.can("governance.packet")} onCreateBeneficiary={store.createBeneficiary} onRequestDistribution={store.requestDistribution} onApproveDistribution={store.approveDistribution} onCreateNotice={store.createNotice} onServeNotice={store.serveNotice} onBuildPacket={store.buildPacket} onCreatePolicyVersion={store.createPolicyVersion} onActivatePolicyVersion={store.activatePolicyVersion} />;
    case "audit":
      return <AuditPanel auditTrail={store.auditTrail} verification={store.auditVerification} storageMeta={store.storageMeta} canReadFull={store.can("audit.full.read")} canVerify={store.can("audit.verify")} />;
    default:
      return null;
  }
}
