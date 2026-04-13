import crypto from "node:crypto";
import type { ContactRecord, IntegrationRecord, RequestContext, TaskRecord, TimerRecord } from "../../models/domain.js";
import { assertAuthorized, getActor } from "../../services/authorization.service.js";
import { db } from "../../store/governance-store.js";
import { isIntegrationAvailable } from "../../config/integrations.js";
import { matchesScopedRecord, resolveTrustId, scopeCollectionByTrust } from "../../services/tenancy.service.js";

export class IntegrationRepository {
  listAvailable(context: RequestContext): IntegrationRecord[] {
    return db.integrations.filter((item) => (!item.tenantId || item.tenantId === context.user.tenantId) && isIntegrationAvailable(item.provider) && item.status !== "placeholder");
  }

  async markSync(context: RequestContext, providerId: string): Promise<IntegrationRecord> {
    assertAuthorized(context, "integrations.sync", "Marking integration sync");
    const index = db.integrations.findIndex((item) => item.id === providerId);
    if (index < 0) throw new Error("Integration not found.");
    const before = structuredClone(db.integrations[index]);
    if (!isIntegrationAvailable(before.provider)) {
      const error = new Error(`${before.provider} integration is hidden until secure OAuth and least-privilege scopes are configured.`) as Error & { statusCode?: number };
      error.statusCode = 404;
      throw error;
    }
    const updated = { ...before, lastSyncAt: new Date().toISOString(), status: before.status === "placeholder" ? "configured-local" : before.status };
    db.integrations[index] = updated;
    db.addAudit("INTEGRATION_SYNC_MARKED", "integration", providerId, before, updated, undefined, getActor(context));
    await db.persist("integration-sync");
    return updated;
  }
}

export class TaskRepository {
  listRules() { return db.deadlineRules; }
  listTasks(context: RequestContext) {
    const { trustId } = resolveTrustId(context);
    return scopeCollectionByTrust(db.tasks, trustId);
  }
  computeDueDate(triggerDate: string, days: number): string {
    const date = new Date(`${triggerDate}T12:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }
  async createTask(context: RequestContext, input: Record<string, unknown>): Promise<TaskRecord> {
    assertAuthorized(context, "tasks.create", "Creating tasks");
    const { trustId } = resolveTrustId(context, (input.trustId as string | undefined) || null);
    const triggerDate = String(input.triggerDate || new Date().toISOString()).slice(0, 10);
    const customDayValue = typeof input.customDayValue === "number" ? input.customDayValue : null;
    const rule = input.rule as { code?: string; defaultDays?: number } | undefined;
    const presetDays = typeof rule?.defaultDays === "number" ? rule.defaultDays : null;
    const dayCount = customDayValue ?? presetDays ?? 0;
    const task: TaskRecord = {
      id: crypto.randomUUID(), trustId, documentId: (input.documentId as string) || null, contactId: (input.contactId as string) || null,
      title: String(input.title || "UNTITLED TASK").trim(), taskType: String(input.taskType || "administrative"), status: String(input.status || "open"), priority: String(input.priority || "normal"),
      triggerDate, dueDate: String(input.dueDate || this.computeDueDate(triggerDate, dayCount)), completedAt: null, assignedTo: String(input.assignedTo || context.user.email),
      ruleCode: rule?.code || (customDayValue !== null ? "CUSTOM" : null), customDayValue, notes: String(input.notes || ""), reminders: Array.isArray(input.reminders) ? input.reminders : [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), immutable: false, deletedAt: null, deletedBy: null,
    };
    db.tasks.unshift(task); db.addAudit("TASK_CREATED", "task", task.id, null, task, undefined, getActor(context)); await db.persist("task-created"); return task;
  }
  async createTaskFromDocument(context: RequestContext, input: Record<string, unknown>) {
    assertAuthorized(context, "tasks.create", "Creating deadline workflow");
    const documentId = (input.documentId as string) || null;
    const title = String(input.title || "DOCUMENT DEADLINE").trim();
    const presetDays = Number(input.presetDays || 15);
    const sourceChannel = String(input.sourceChannel || "repository");
    const triggerDate = new Date().toISOString().slice(0, 10);
    const task = await this.createTask(context, { title, documentId, taskType: sourceChannel === "intake" ? "intake-administrative-deadline" : "administrative-deadline", triggerDate, dueDate: this.computeDueDate(triggerDate, presetDays), rule: { code: `D${presetDays}`, defaultDays: presetDays }, notes: `Auto-created from ${sourceChannel} document ${documentId}.` });
    const timerRepo = new TimerRepository();
    const timer = await timerRepo.startTimer(context, { relatedTaskId: task.id, relatedDocumentId: documentId, label: `Deadline Timer • ${title}`, timerType: "count-up", createdBy: context.user.email });
    db.addAudit("DEADLINE_WORKFLOW_CREATED", "document", documentId, null, { taskId: task.id, timerId: timer.id, presetDays, sourceChannel }, undefined, getActor(context));
    await db.persist("deadline-workflow-created");
    return { task, timer };
  }
  async completeTask(context: RequestContext, taskId: string): Promise<TaskRecord> {
    assertAuthorized(context, "tasks.complete", "Completing tasks");
    const { trustId } = resolveTrustId(context);
    const index = db.tasks.findIndex((task) => task.id === taskId && matchesScopedRecord(task, trustId));
    if (index < 0) throw new Error("Task not found.");
    const before = structuredClone(db.tasks[index]); if (before.immutable) throw new Error("Immutable tasks cannot be modified.");
    const updated = { ...before, status: "completed", completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.tasks[index] = updated; db.addAudit("TASK_COMPLETED", "task", taskId, before, updated, undefined, getActor(context)); await db.persist("task-completed"); return updated;
  }
}

export class ContactRepository {
  listContacts(context: RequestContext) { const { trustId } = resolveTrustId(context); return scopeCollectionByTrust(db.contacts, trustId); }
  async saveContact(context: RequestContext, input: Partial<ContactRecord>) {
    assertAuthorized(context, "contacts.write", "Saving contacts");
    const now = new Date().toISOString();
    const { trustId } = resolveTrustId(context, input.trustId || null);
    const existingIndex = input.id ? db.contacts.findIndex((item) => item.id === input.id && matchesScopedRecord(item, trustId)) : -1;
    const before = existingIndex >= 0 ? structuredClone(db.contacts[existingIndex]) : null;
    if (before?.immutable) throw new Error("Immutable contacts cannot be modified.");
    const record: ContactRecord = { id: input.id || crypto.randomUUID(), trustId, contactType: input.contactType || "general", fullName: String(input.fullName || "UNNAMED CONTACT").trim(), organization: input.organization || "", email: input.email || "", phone: input.phone || "", addressLine1: input.addressLine1 || "", addressLine2: input.addressLine2 || "", city: input.city || "", state: input.state || "", postalCode: input.postalCode || "", country: input.country || "", notes: input.notes || "", createdAt: before?.createdAt || now, updatedAt: now, immutable: before?.immutable || false, deletedAt: before?.deletedAt || null, deletedBy: before?.deletedBy || null };
    if (existingIndex >= 0) db.contacts[existingIndex] = record; else db.contacts.unshift(record);
    db.addAudit(before ? "CONTACT_UPDATED" : "CONTACT_CREATED", "contact", record.id, before, record, undefined, getActor(context)); await db.persist(before ? "contact-updated" : "contact-created"); return record;
  }
}

export class TimerRepository {
  listTimers(context: RequestContext) { const { trustId } = resolveTrustId(context); return scopeCollectionByTrust(db.timers, trustId); }
  async startTimer(context: RequestContext, input: Partial<TimerRecord> = {}) {
    assertAuthorized(context, "timers.start", "Starting timers");
    const { trustId } = resolveTrustId(context, input.trustId || null);
    const timer: TimerRecord = { id: crypto.randomUUID(), trustId, relatedTaskId: input.relatedTaskId || null, relatedDocumentId: input.relatedDocumentId || null, timerType: input.timerType || "count-up", label: String(input.label || "ACTIVE TIMER").trim(), startedAt: new Date().toISOString(), stoppedAt: null, durationSeconds: 0, notes: input.notes || "", createdBy: input.createdBy || context.user.email, immutable: false, deletedAt: null };
    db.timers.unshift(timer); db.addAudit("TIMER_STARTED", "timer", timer.id, null, timer, undefined, getActor(context)); await db.persist("timer-started"); return timer;
  }
  async stopTimer(context: RequestContext, id: string) {
    assertAuthorized(context, "timers.stop", "Stopping timers");
    const { trustId } = resolveTrustId(context); const index = db.timers.findIndex((timer) => timer.id === id && matchesScopedRecord(timer, trustId));
    if (index < 0) throw new Error("Timer not found.");
    const before = structuredClone(db.timers[index]); if (before.immutable) throw new Error("Immutable timers cannot be modified."); if (before.stoppedAt) return before;
    const stoppedAt = new Date().toISOString(); const durationSeconds = Math.max(0, Math.round((new Date(stoppedAt).getTime() - new Date(before.startedAt).getTime()) / 1000));
    const updated = { ...before, stoppedAt, durationSeconds, immutable: true };
    db.timers[index] = updated; db.addAudit("TIMER_STOPPED", "timer", id, before, updated, undefined, getActor(context)); await db.persist("timer-stopped"); return updated;
  }
}

export const integrationRepository = new IntegrationRepository();
export const taskRepository = new TaskRepository();
export const contactRepository = new ContactRepository();
export const timerRepository = new TimerRepository();
