import { env } from "../config/env.js";
import type { PoolClient } from "pg";
import { db } from "./governance-store.js";

type TransactionCallback<T> = (client: PoolClient | null) => Promise<T>;

export async function withUnitOfWork<T>(
  label: string,
  work: TransactionCallback<T>,
): Promise<T> {
  const pool = (db as { pool?: { connect?: () => Promise<PoolClient> } }).pool;

  if (!pool?.connect) {
    if (!env.isTestMode) {
      throw new Error(`DB-only unit-of-work enforcement blocked non-test mutation path: ${label}`);
    }
    const result = await work(null);
    await db.persist(label);
    return result;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await db.persistWithinTransaction(client, label);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
