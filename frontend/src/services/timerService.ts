import type { TimerRecord } from "../models/types";
import { apiClient } from "./apiClient";

export const timerService = {
  async listTimers() {
    return apiClient.get<TimerRecord[]>("/timers");
  },

  async startTimer(payload: Record<string, any> = {}) {
    return apiClient.post<TimerRecord>("/timers", payload);
  },

  async stopTimer(timerId: string) {
    return apiClient.patch<TimerRecord>(`/timers/${timerId}/stop`, {});
  },
};
