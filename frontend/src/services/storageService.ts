const DB_NAME = "aegis_governance_local_db";
const DB_VERSION = 2;
const STORE_NAMES = [
  "settings",
  "contacts",
  "tasks",
  "deadlineRules",
  "integrations",
  "documents",
  "audit",
  "timers",
  "controls",
] as const;

type StoreName = (typeof STORE_NAMES)[number] | string;

const localCacheEnabled = String(import.meta.env.VITE_ENABLE_LOCAL_CACHE || "false").toLowerCase() === "true";

function isIndexedDbAvailable() {
  return typeof indexedDB !== "undefined";
}

function ensureLocalCacheEnabled() {
  if (!localCacheEnabled || !isIndexedDbAvailable()) return false;
  return true;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      STORE_NAMES.forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(storeName: StoreName, mode: IDBTransactionMode, executor: (store: IDBObjectStore) => T | Promise<T>, fallback: T): Promise<T> {
  if (!ensureLocalCacheEnabled()) return fallback;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = executor(store);
    tx.oncomplete = async () => {
      db.close();
      resolve(await result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function deleteDatabase(): Promise<boolean> {
  if (!isIndexedDbAvailable()) return false;
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve(false);
  });
}

export const storageService = {
  isEnabled() {
    return ensureLocalCacheEnabled();
  },

  async list<T>(storeName: StoreName): Promise<T[]> {
    return run(storeName, "readonly", (store) => new Promise<T[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result || []) as T[]);
      request.onerror = () => reject(request.error);
    }), []);
  },

  async get<T>(storeName: StoreName, id: IDBValidKey): Promise<T | null> {
    return run(storeName, "readonly", (store) => new Promise<T | null>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve((request.result as T | undefined) || null);
      request.onerror = () => reject(request.error);
    }), null);
  },

  async put<T>(storeName: StoreName, record: T): Promise<IDBValidKey | undefined> {
    return run(storeName, "readwrite", (store) => new Promise<IDBValidKey | undefined>((resolve, reject) => {
      const request = store.put(record as IDBValidKey);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }), undefined);
  },

  async bulkPut<T>(storeName: StoreName, records: T[]): Promise<boolean> {
    return run(storeName, "readwrite", (store) => {
      records.forEach((record) => store.put(record as IDBValidKey));
      return true;
    }, false);
  },

  async remove(storeName: StoreName, id: IDBValidKey): Promise<void> {
    return run(storeName, "readwrite", (store) => new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }), undefined);
  },

  async wipe(): Promise<boolean> {
    return deleteDatabase();
  },
};
