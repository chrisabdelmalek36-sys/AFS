import { Pool } from "pg";

const url =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/afs_leads";

// Reuse one pool across hot reloads in dev.
const g = globalThis as unknown as { _pgPool?: Pool };
export const pool = g._pgPool ?? new Pool({ connectionString: url });
if (process.env.NODE_ENV !== "production") g._pgPool = pool;

export async function q<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const r = await pool.query(text, params as never[]);
  return r.rows as T[];
}
