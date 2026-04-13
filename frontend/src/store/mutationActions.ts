import { authService } from "../services/authService";
import { settingsService } from "../services/settingsService";
import { contactService } from "../services/contactService";
import { taskService } from "../services/taskService";
import { integrationService } from "../services/integrationService";
import { documentService } from "../services/documentService";
import { controlService } from "../services/controlService";
import { timerService } from "../services/timerService";
import { governanceService } from "../services/governanceService";
import { diagnosticsService } from "../services/diagnosticsService";
import { queryClient } from "../services/queryClient";
import { QUERY_REFRESH_GROUPS } from "./queryDefinitions";

async function runMutation<T>(key: string, action: () => Promise<T>): Promise<T> {
  return queryClient.runMutation(key, action);
}

export function createMutationActions(context: any) {
  const {
    setNeedsBootstrap,
    setPendingMfaChallenge,
    setMfaSetup,
    setIsAuthenticated,
    setCurrentUser,
    setBootstrapped,
    invalidateAndRefresh,
    refreshSessionShell,
    pendingMfaChallenge,
  } = context;

  return {
    getMutationState: (key: string) => queryClient.getMutationState(key),
    getInvalidationDiagnostics: () => queryClient.getInvalidationDiagnostics(),
    async bootstrapAdmin(payload: Record<string, unknown>) {
      return runMutation("bootstrapAdmin", async () => {
        await authService.bootstrapAdmin(payload);
        setNeedsBootstrap(false);
        await refreshSessionShell();
      });
    },
    async login(email: string, password: string) {
      return runMutation("login", async () => {
        const response = await authService.login(email, password);
        setNeedsBootstrap(false);
        if (response?.requiresMfa) {
          setPendingMfaChallenge({
            challengeToken: response.challengeToken,
            challengeMethod: response.challengeMethod || "totp",
            challengeExpiresInSeconds: response.challengeExpiresInSeconds || 300,
            challengeUser: response.challengeUser || { email },
          });
          setIsAuthenticated(false);
          setCurrentUser(null);
          setBootstrapped(false);
          setMfaSetup(null);
          return { requiresMfa: true };
        }
        setPendingMfaChallenge(null);
        await refreshSessionShell();
        return { ok: true };
      });
    },
    async verifyMfaChallenge(code: string) {
      return runMutation("verifyMfaChallenge", async () => {
        const challengeToken = pendingMfaChallenge?.challengeToken;
        if (!challengeToken) throw new Error("No multi-factor challenge is pending.");
        await authService.verifyMfaChallenge(String(challengeToken), code);
        setPendingMfaChallenge(null);
        await refreshSessionShell();
        return { ok: true };
      });
    },
    async logout() {
      return runMutation("logout", async () => {
        await authService.logout();
        setIsAuthenticated(false);
        setCurrentUser(null);
        setBootstrapped(false);
        setPendingMfaChallenge(null);
        setMfaSetup(null);
      });
    },
    async changePassword(currentPassword: string, newPassword: string) {
      return runMutation("changePassword", async () => {
        await authService.changePassword(currentPassword, newPassword);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.auth, "password-changed");
      });
    },
    async beginMfaSetup() {
      return runMutation("beginMfaSetup", async () => {
        const result = await authService.beginMfaSetup();
        setMfaSetup(result);
        return result;
      });
    },
    async enableMfa(code: string) {
      return runMutation("enableMfa", async () => {
        const result = await authService.enableMfa(code);
        setMfaSetup({ completed: true });
        await refreshSessionShell();
        return result;
      });
    },
    clearMfaSetup() {
      setMfaSetup(null);
    },
    async saveSettings(nextSettings: Record<string, unknown>) {
      return runMutation("saveSettings", async () => {
        await settingsService.saveSettings(nextSettings);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.settings, "settings-saved");
      });
    },
    async saveContact(payload: Record<string, unknown>) {
      return runMutation("saveContact", async () => {
        await contactService.saveContact(payload);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.contacts, "contact-saved");
      });
    },
    async createTask(payload: Record<string, unknown>) {
      return runMutation("createTask", async () => {
        await taskService.createTask(payload);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.tasks, "task-created");
      });
    },
    async createTaskFromDocument(document: any, presetDays: number) {
      return runMutation("createTaskFromDocument", async () => {
        await taskService.createTaskFromDocument({ documentId: document.id, title: `Deadline: ${document.title}`, presetDays });
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.tasks, "task-created-from-document");
      });
    },
    async completeTask(taskId: string) {
      return runMutation("completeTask", async () => {
        await taskService.completeTask(taskId);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.tasks, "task-completed");
      });
    },
    async markIntegrationSync(providerId: string) {
      return runMutation("markIntegrationSync", async () => {
        await integrationService.markSync(providerId);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.integrations, "integration-sync");
      });
    },
    async createDocument(payload: any) {
      return runMutation("createDocument", async () => {
        const createdDocument = payload?.file
          ? await documentService.uploadDocument(payload)
          : await documentService.createDocument(payload);
        if (payload?.deadlinePresetDays) {
          await taskService.createTaskFromDocument({
            documentId: createdDocument.id,
            title: `Deadline: ${createdDocument.title}`,
            presetDays: payload.deadlinePresetDays,
            sourceChannel: payload?.file ? "upload" : "intake",
          });
        }
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.documents, "document-created");
        return createdDocument;
      });
    },
    async archiveDocument(id: string) {
      return runMutation("archiveDocument", async () => {
        await documentService.archiveDocument(id);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.documentArchive, "document-archived");
      });
    },
    async savePermissions(nextPermissions: import("../models/types").PermissionMatrix) {
      return runMutation("savePermissions", async () => {
        await controlService.savePermissions(nextPermissions);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.permissions, "permissions-saved");
      });
    },
    async createManagedUser(payload: Record<string, unknown>) {
      return runMutation("createManagedUser", async () => {
        await authService.createUser(payload);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.users, "managed-user-created");
      });
    },
    async startTimer(payload: Record<string, unknown>) {
      return runMutation("startTimer", async () => {
        await timerService.startTimer(payload);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.timers, "timer-started");
      });
    },
    async stopTimer(timerId: string) {
      return runMutation("stopTimer", async () => {
        await timerService.stopTimer(timerId);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.timers, "timer-stopped");
      });
    },
    async createBeneficiary(payload: Record<string, unknown>) {
      return runMutation("createBeneficiary", async () => {
        await governanceService.createBeneficiary(payload);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.governance, "beneficiary-created");
      });
    },
    async requestDistribution(payload: Record<string, unknown>) {
      return runMutation("requestDistribution", async () => {
        await governanceService.requestDistribution(payload);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.governance, "distribution-requested");
      });
    },
    async approveDistribution(id: string, payload: Record<string, unknown>) {
      return runMutation("approveDistribution", async () => {
        await governanceService.approveDistribution(id, payload);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.governance, "distribution-approved");
      });
    },
    async createNotice(payload: Record<string, unknown>) {
      return runMutation("createNotice", async () => {
        await governanceService.createNotice(payload);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.governance, "notice-created");
      });
    },
    async serveNotice(id: string, payload: Record<string, unknown>) {
      return runMutation("serveNotice", async () => {
        await governanceService.serveNotice(id, payload);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.governance, "notice-served");
      });
    },
    async refreshDiagnostics() {
      return runMutation("refreshDiagnostics", async () => {
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.diagnostics, "diagnostics-refresh");
      });
    },
    async verifyBackups() {
      return runMutation("verifyBackups", async () => {
        await diagnosticsService.verifyBackups();
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.diagnostics, "backups-verified");
      });
    },
    async createPolicyVersion(payload: Record<string, unknown>) {
      return runMutation("createPolicyVersion", async () => {
        const result = await governanceService.createPolicyVersion(payload);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.governance, "policy-version-created");
        return result;
      });
    },
    async activatePolicyVersion(policyType: string, versionId: string) {
      return runMutation("activatePolicyVersion", async () => {
        const result = await governanceService.activatePolicyVersion(policyType, versionId);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.governance, "policy-version-activated");
        return result;
      });
    },
    async buildPacket(payload: Record<string, unknown>) {
      return runMutation("buildPacket", async () => {
        const result = await governanceService.buildPacket(payload);
        await invalidateAndRefresh(QUERY_REFRESH_GROUPS.packets, "packet-built");
        return result;
      });
    },
  };
}
