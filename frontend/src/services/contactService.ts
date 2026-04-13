import type { ContactRecord } from "../models/types";
import { apiClient } from "./apiClient";

export const contactService = {
  async listContacts() {
    return apiClient.get<ContactRecord[]>("/contacts");
  },

  async saveContact(payload: ContactRecord) {
    return apiClient.post<ContactRecord>("/contacts", payload);
  },
};
