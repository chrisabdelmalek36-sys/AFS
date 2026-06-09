import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pool } from "./db";
import { normalizePhone } from "./engine/util/dedup";
import { log } from "./engine/util/logger";

// Runtime, self-healing database bootstrap.
//
// Vercel-Neon (and most hosts) only attach the database AFTER the first
// build, and the build sandbox often can't reach it — so the build-time
// `postbuild` migrate/seed step is unreliable. The result was a live site
// stuck on the "Database not connected" error because the tables never got
// created. This runs the (idempotent) migrations + seed on the FIRST request
// instead, so the dashboard heals itself with no redeploy or code change.

const g = globalThis as unknown as { _afsReady?: Promise<void> };

// True only while the bootstrap itself is running. The sample pipeline issues
// its own queries through db.ts; without this guard those queries would await
// the very promise that is awaiting them — a deadlock.
let bootstrapping = false;
export const isBootstrapping = (): boolean => bootstrapping;

async function migrate(): Promise<void> {
  const dir = join(process.cwd(), "db", "migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    await pool.query(await readFile(join(dir, f), "utf8"));
  }
  log.info(`bootstrap: applied ${files.length} migration(s)`);
}

async function seedDoNotContact(): Promise<void> {
  // Mirrors scripts/seed.ts — proves suppression against the sample data.
  const phone = normalizePhone("+20 1111 999000");
  await pool.query(
    `INSERT INTO do_not_contact (phone_norm, channel, reason)
     SELECT $1, 'all', 'Replied STOP — demo suppression record'
     WHERE NOT EXISTS (SELECT 1 FROM do_not_contact WHERE phone_norm = $1)`,
    [phone],
  );
}

async function loadSampleIfEmpty(): Promise<void> {
  // Only ever seed the 21 practice leads into a brand-new (empty) database, so
  // we never duplicate or disturb a populated one. The heavier live OSM scan
  // stays on the daily cron — bootstrap must be fast and network-free.
  const r = await pool.query<{ n: string }>(`SELECT COUNT(*)::text n FROM leads`);
  if (Number(r.rows[0]?.n ?? 0) > 0) return;
  const { runPipeline } = await import("./engine/pipeline");
  await runPipeline("sample");
  log.info("bootstrap: loaded sample leads into empty database");
}

async function run(): Promise<void> {
  await migrate();
  await seedDoNotContact();
  await loadSampleIfEmpty();
}

/**
 * Ensure the schema exists and demo data is seeded. Idempotent and memoized,
 * so the real work happens once per server instance; every later call just
 * awaits the cached promise. Safe to await at the top of any request path.
 */
export function ensureReady(): Promise<void> {
  if (!g._afsReady) {
    bootstrapping = true;
    const p = run().finally(() => {
      bootstrapping = false;
    });
    // Don't cache a failed bootstrap — let the next request retry (e.g. once
    // the database finishes provisioning) instead of erroring forever.
    p.catch(() => {
      if (g._afsReady === p) g._afsReady = undefined;
    });
    g._afsReady = p;
  }
  return g._afsReady;
}
