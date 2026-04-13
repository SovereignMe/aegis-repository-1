import { db as inMemoryDb, LOCAL_TENANT_ID, LOCAL_TRUST_ID } from "../services/inMemoryStore.js";

export const db = inMemoryDb;
export { LOCAL_TENANT_ID, LOCAL_TRUST_ID };
