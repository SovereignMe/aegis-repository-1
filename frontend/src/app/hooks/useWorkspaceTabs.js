import { useEffect, useMemo, useState } from "react";
import { WORKSPACE_TAB_CONTRACTS } from "@trust-governance/shared/permissions";
import { canAccessWorkspaceTab } from "../../utils/permissions";

const HASH_TAB_ALIASES = {
  repository: "repository",
  documents: "repository",
  intake: "intake",
  deadlines: "deadlines",
  tasks: "deadlines",
  contacts: "contacts",
  integrations: "integrations",
  controls: "controls",
  settings: "settings",
  governance: "governance",
  ledgers: "governance",
  audit: "audit",
  audits: "audit",
};

const BASE_TABS = WORKSPACE_TAB_CONTRACTS.filter((tab) => tab.key !== "integrations").map((tab) => ({
  key: tab.key,
  label: tab.label,
  action: tab.anyOf[0],
}));

function resolveTabFromHash() {
  if (typeof window === "undefined") return "repository";
  const rawHash = window.location.hash.replace(/^#/, "").trim().toLowerCase();
  const rootHash = rawHash.split('/')[0];
  return HASH_TAB_ALIASES[rootHash] || HASH_TAB_ALIASES[rawHash] || "repository";
}

export function canAccessGovernanceTab(store) {
  return canAccessWorkspaceTab(store.permissions, store.role, "governance");
}

export function canAccessAuditTab(store) {
  return canAccessWorkspaceTab(store.permissions, store.role, "audit");
}

export function useWorkspaceTabs(store) {
  const integrationsVisible = Array.isArray(store.integrations) && store.integrations.length > 0 && canAccessWorkspaceTab(store.permissions, store.role, "integrations");
  const tabs = useMemo(
    () => (integrationsVisible ? [...BASE_TABS, { key: "integrations", label: "INTEGRATIONS", action: "integrations.read" }] : BASE_TABS),
    [integrationsVisible],
  );
  const [activeTab, setActiveTab] = useState(resolveTabFromHash);

  useEffect(() => {
    function handleHashChange() {
      const nextTab = resolveTabFromHash();
      setActiveTab(nextTab === "integrations" && !integrationsVisible ? "settings" : nextTab);
    }

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [integrationsVisible]);

  useEffect(() => {
    if (activeTab === "integrations" && !integrationsVisible) setActiveTab("settings");
  }, [activeTab, integrationsVisible]);

  useEffect(() => {
    const currentHash = window.location.hash || '';
    if (activeTab === 'governance' && currentHash.startsWith('#governance/')) return;
    const expectedHash = `#${activeTab}`;
    if (currentHash !== expectedHash) {
      window.history.replaceState(null, '', expectedHash);
    }
  }, [activeTab]);

  return { tabs, activeTab, setActiveTab, integrationsVisible };
}
