import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { env } from "../config/env.js";

async function ensurePool() {
  if (!env.databaseUrl) throw new Error("DATABASE_URL is required for migrations.");
  return new Pool({ connectionString: env.databaseUrl, ssl: env.databaseUrl.includes("localhost") ? undefined : { rejectUnauthorized: false } });
}

async function main() {
  const direction = process.argv[2] === "down" ? "down" : "up";
  const pool = await ensurePool();
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS app_migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    const migrationsDir = path.resolve(process.cwd(), "..", "shared", "migrations");
    if (direction === "up") {
      const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith("_up.sql")).sort();
      for (const file of files) {
        const id = file.replace(/_up\.sql$/, "");
        const applied = await pool.query(`SELECT 1 FROM app_migrations WHERE id = $1`, [id]);
        if (applied.rowCount) continue;
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
    } else {
      const last = await pool.query(`SELECT id FROM app_migrations ORDER BY applied_at DESC, id DESC LIMIT 1`);
      if (!last.rowCount) return;
      const id = last.rows[0].id as string;
      const downFile = path.join(migrationsDir, `${id}_down.sql`);
      const sql = await fs.readFile(downFile, "utf8");
      await pool.query("BEGIN");
      try {
        await pool.query(sql);
        await pool.query(`DELETE FROM app_migrations WHERE id = $1`, [id]);
        await pool.query("COMMIT");
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
