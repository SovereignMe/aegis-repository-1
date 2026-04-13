import type { TaskRecord } from "../models/types";
import { apiClient } from "./apiClient";

export const taskService = {
  async listRules() {
    return apiClient.get<Record<string, any>[]>("/deadline-rules");
  },

  async listTasks() {
    return apiClient.get<TaskRecord[]>("/tasks");
  },

  async createTask(payload: Record<string, any>) {
    return apiClient.post<TaskRecord>("/tasks", payload);
  },

  async createTaskFromDocument(payload: Record<string, any>) {
    return apiClient.post<TaskRecord>("/tasks/from-document", payload);
  },

  async completeTask(taskId: string) {
    return apiClient.patch<TaskRecord>(`/tasks/${taskId}/complete`, {});
  },

  computeCountdown(task: TaskRecord | null | undefined): number | null {
    if (!task?.dueDate) return null;
    const now = new Date();
    const due = new Date(`${task.dueDate}T23:59:59`);
    return Math.ceil((due.getTime() - now.getTime()) / 86400000);
  },
};
