import { AppHero } from "../components/AppHero";
import { WorkspaceNav } from "../components/WorkspaceNav";
import { AppContent } from "../components/AppContent";

export function AuthenticatedWorkspace({ store, tabs, activeTab, onSelectTab, nextDueTask }) {
  return (
    <div className="app-shell">
      <div className="ambient-orb ambient-orb-left" />
      <div className="ambient-orb ambient-orb-right" />
      <div className="app-container">
        <AppHero
          currentUser={store.currentUser}
          nextDueTask={nextDueTask}
          settings={store.settings}
          storageMeta={store.storageMeta}
          auditVerification={store.auditVerification}
          role={store.role}
          documents={store.documents}
          tasks={store.tasks}
          onLogout={() => store.logout()}
        />

        <WorkspaceNav store={store} tabs={tabs} activeTab={activeTab} onSelectTab={onSelectTab} />
        <AppContent activeTab={activeTab} store={store} />
      </div>
    </div>
  );
}
