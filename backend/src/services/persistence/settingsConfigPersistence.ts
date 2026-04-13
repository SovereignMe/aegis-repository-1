import { Pool } from "pg";
import { env } from "../../config/env.js";

type SettingsConfigState = Record<string, unknown>;

function getPool(): Pool {
  const connectionString = env.databaseUrl;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  return new Pool({
    connectionString,
    ssl: connectionString.includes("localhost")
      ? undefined
      : { rejectUnauthorized: false },
  });
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function makeJsonSafe(value: unknown): unknown {
  const seen = new WeakSet();

  function walk(input: unknown): unknown {
    if (input === null || input === undefined) return null;

    const t = typeof input;

    if (t === "string" || t === "number" || t === "boolean") return input;
    if (t === "bigint") return input.toString();
    if (t === "function" || t === "symbol") return null;

    if (input instanceof Date) return input.toISOString();

    if (Array.isArray(input)) return input.map(walk);

    if (t === "object") {
      const obj = input as Record<string, unknown>;

      if (seen.has(obj)) return "[Circular]";
      seen.add(obj);

      const proto = Object.getPrototypeOf(obj);
      const isPlainObject = proto === Object.prototype || proto === null;

      if (!isPlainObject) {
        try {
          return String(obj);
        } catch {
          return "[Unsupported Object]";
        }
      }

      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj)) {
        out[key] = walk(val);
      }
      return out;
    }

    return null;
  }

  return walk(value);
}

export async function loadSettingsConfigState(): Promise<SettingsConfigState> {
  const pool = getPool();

  try {
    const result = await pool.query(
      `
      SELECT setting_key, setting_value_json
      FROM app_settings
      WHERE scope_type = 'app'
        AND scope_id = ''
      ORDER BY setting_key
      `
    );

    const state: SettingsConfigState = {};

    for (const row of result.rows) {
      const key = row.setting_key as string;
      if (!key) continue;
      state[key] = makeJsonSafe(row.setting_value_json);
    }

    return state;
  } catch (error) {
    throw new Error(`Failed to load settings config state: ${safeErrorMessage(error)}`);
  } finally {
    await pool.end();
  }
}

export async function persistSettingsConfigState(
  state: SettingsConfigState
): Promise<void> {
  const pool = getPool();

  try {
    await pool.query("BEGIN");

    for (const [settingKey, rawValue] of Object.entries(state ?? {})) {
      if (!settingKey || !settingKey.trim()) continue;

      const safeValue = makeJsonSafe(rawValue);
      const safeJson = JSON.stringify(safeValue);

      await pool.query(
        `
        INSERT INTO app_settings (
          scope_type,
          scope_id,
          setting_key,
          setting_value_json,
          updated_at
        )
        VALUES ('app', '', $1, $2::jsonb, NOW())
        ON CONFLICT (scope_type, scope_id, setting_key)
        DO UPDATE SET
          setting_value_json = EXCLUDED.setting_value_json,
          updated_at = NOW()
        `,
        [settingKey, safeJson]
      );
    }

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw new Error(`Failed to persist settings config state: ${safeErrorMessage(error)}`);
  } finally {
    await pool.end();
  }
}