import pg, { type QueryResult, type QueryResultRow } from "pg";

// Vercel's Neon integration may name the env var POSTGRES_URL (newer
// integrations) or DATABASE_URL (older / classic). Accept both, plus
// Prisma's variants, so the user never has to rename anything by hand.
const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "postgres://postgres:postgres@localhost:5432/afs_leads";

// One pool, reused across hot reloads.
const g = globalThis as unknown as { _pgPool?: pg.Pool };
export const pool = g._pgPool ?? new pg.Pool({ connectionString: url });
if (process.env.NODE_ENV !== "production") g._pgPool = pool;

/** Dashboard-style helper: returns rows directly. */
export async function q<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const r = await pool.query(text, params as never[]);
  return r.rows as T[];
}

/** Engine-style helper: returns the raw QueryResult (.rows etc). */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as never[]);
}

export async function closeDb(): Promise<void> {
  await pool.end();
}
