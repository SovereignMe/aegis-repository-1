import fs from "node:fs/promises";
import path from "node:path";
import type { Pool } from "pg";

export async function runPostgresMigrations(pool: Pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS app_migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  const migrationsDir = path.resolve(process.cwd(), "..", "shared", "migrations");
  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith("_up.sql")).sort();
  for (const file of files) {
    const id = file.replace(/_up\.sql$/, "");
    const exists = await pool.query(`SELECT 1 FROM app_migrations WHERE id = $1`, [id]);
    if (exists.rowCount) continue;
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query(`INSERT INTO app_migrations (id) VALUES ($1)`, [id]);
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }
}
