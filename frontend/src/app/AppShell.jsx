import { useMemo } from "react";
import { useGovernanceStore } from "../store/useGovernanceStore";
import { AppLoadingScreen, BootstrapScreen, LoginScreen, MfaChallengeScreen, MfaSetupScreen, PasswordChangeScreen } from "./components/AuthScreens";
import { useWorkspaceTabs } from "./hooks/useWorkspaceTabs";
import { AuthenticatedWorkspace } from "./components/AuthenticatedWorkspace";

function nextDueTaskFor(tasks) {
  return [...tasks]
    .filter((task) => task.status !== "completed")
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0] || null;
}

export default function AppShell() {
  const store = useGovernanceStore();
  const { tabs, activeTab, setActiveTab } = useWorkspaceTabs(store);
  const nextDueTask = useMemo(() => nextDueTaskFor(store.tasks), [store.tasks]);

  if (!store.isAuthenticated) {
    if (store.needsBootstrap) return <BootstrapScreen ready={store.authChecked} onBootstrap={store.bootstrapAdmin} />;
    if (store.pendingMfaChallenge) return <MfaChallengeScreen ready={store.authChecked} pendingMfaChallenge={store.pendingMfaChallenge} onVerify={store.verifyMfaChallenge} onCancel={store.logout} />;
    return <LoginScreen ready={store.authChecked} onLogin={store.login} />;
  }

  if (store.currentUser?.mustChangePassword) return <PasswordChangeScreen onSubmit={store.changePassword} />;
  if (store.currentUser?.mfaSetupRequired || store.mfaSetup?.completed) {
    return <MfaSetupScreen currentUser={store.currentUser} mfaSetup={store.mfaSetup} onBeginSetup={store.beginMfaSetup} onEnable={store.enableMfa} onAcknowledge={store.clearMfaSetup} />;
  }

  if (!store.bootstrapped) return <AppLoadingScreen />;

  return <AuthenticatedWorkspace store={store} tabs={tabs} activeTab={activeTab} onSelectTab={setActiveTab} nextDueTask={nextDueTask} />;
}
