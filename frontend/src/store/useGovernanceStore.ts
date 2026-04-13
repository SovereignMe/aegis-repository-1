import type { PermissionAction } from "@trust-governance/shared/permissions";
import { useMemo } from "react";
import { queryClient } from "../services/queryClient";
import { createMutationActions } from "./mutationActions";
import { canPerform } from "../utils/permissions";
import { useGovernanceState } from "./slices/useGovernanceState";
import { useGovernanceQueries } from "./hooks/useGovernanceQueries";

export function useGovernanceStore() {
  const { state, setters, actions: stateActions } = useGovernanceState();
  const queryActions = useGovernanceQueries({
    currentUser: state.currentUser,
    role: state.role,
    setters,
    setAuthChecked: stateActions.setAuthChecked,
    setIsAuthenticated: stateActions.setIsAuthenticated,
    setBootstrapped: stateActions.setBootstrapped,
    setNeedsBootstrap: stateActions.setNeedsBootstrap,
  });

  const activeTimer = useMemo(() => state.timers.find((timer) => !timer.stoppedAt) || null, [state.timers]);
  const can = (action: PermissionAction) => canPerform(state.permissions, state.role, action);

  const mutations = createMutationActions({
    setNeedsBootstrap: stateActions.setNeedsBootstrap,
    setPendingMfaChallenge: stateActions.setPendingMfaChallenge,
    setMfaSetup: stateActions.setMfaSetup,
    setIsAuthenticated: stateActions.setIsAuthenticated,
    setCurrentUser: stateActions.setCurrentUser,
    setBootstrapped: stateActions.setBootstrapped,
    invalidateAndRefresh: queryActions.invalidateAndRefresh,
    refreshSessionShell: queryActions.refreshSessionShell,
    pendingMfaChallenge: state.pendingMfaChallenge,
  });

  return {
    ...state,
    activeTimer,
    can,
    queryDiagnostics: queryClient.getInvalidationDiagnostics(),
    ...mutations,
  };
}
