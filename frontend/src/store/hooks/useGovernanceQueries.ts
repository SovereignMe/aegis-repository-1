import { useEffect, useMemo } from "react";
import { authService } from "../../services/authService";
import { queryClient } from "../../services/queryClient";
import { QUERY_OPTIONS, SESSION_QUERY_KEYS, applyQueryResult, createQueryFactories } from "../queryDefinitions";
import type { QuerySetterMap } from "../../models/types";

export function useGovernanceQueries(params: {
  currentUser: { role?: string } | null;
  role: string | null;
  setters: QuerySetterMap;
  setAuthChecked: (value: boolean) => void;
  setIsAuthenticated: (value: boolean) => void;
  setBootstrapped: (value: boolean) => void;
  setNeedsBootstrap: (value: boolean) => void;
}) {
  const { currentUser, role, setters, setAuthChecked, setIsAuthenticated, setBootstrapped, setNeedsBootstrap } = params;
  const queryFactories = useMemo(() => createQueryFactories({ currentUser, role }), [currentUser, role]);

  async function fetchAndSet(key: keyof typeof QUERY_OPTIONS | string, force = false) {
    const factory = queryFactories[key];
    if (!factory) return undefined;
    const value = await queryClient.fetchQuery(key, () => factory(), { ...QUERY_OPTIONS[key as keyof typeof QUERY_OPTIONS], force });
    return applyQueryResult(key, value, setters);
  }

  async function refreshFeature(keys: string[], force = false) {
    await Promise.all(keys.map((key) => fetchAndSet(key, force)));
    setIsAuthenticated(true);
    setBootstrapped(true);
    setAuthChecked(true);
  }

  async function refreshSessionShell(force = false) {
    await refreshFeature(SESSION_QUERY_KEYS, force);
  }

  async function invalidateAndRefresh(keys: string[], reason = "manual-refresh") {
    queryClient.invalidateQueries(keys, reason);
    await refreshFeature(keys, true);
  }

  useEffect(() => {
    let cancelled = false;
    authService.getBootstrapStatus()
      .then(async (status) => {
        if (cancelled) return;
        const bootstrapNeeded = Boolean(status?.needsBootstrap);
        setNeedsBootstrap(bootstrapNeeded);
        if (bootstrapNeeded) {
          setAuthChecked(true);
          setIsAuthenticated(false);
          setBootstrapped(false);
          return;
        }

        try {
          await authService.getCurrentUser();
          if (!cancelled) await refreshSessionShell();
        } catch {
          try {
            await authService.refreshAccessToken();
            if (!cancelled) await refreshSessionShell();
          } catch {
            if (cancelled) return;
            setAuthChecked(true);
            setIsAuthenticated(false);
            setBootstrapped(false);
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        setAuthChecked(true);
        setIsAuthenticated(false);
        setBootstrapped(false);
      });
    return () => {
      cancelled = true;
      queryClient.cancelQueries(SESSION_QUERY_KEYS);
    };
  }, []);

  return {
    queryFactories,
    fetchAndSet,
    refreshFeature,
    refreshSessionShell,
    invalidateAndRefresh,
  };
}
