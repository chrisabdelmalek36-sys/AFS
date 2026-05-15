import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { query, closeDb } from "../db/client.js";
import { log } from "../lib/logger.js";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "..", "db", "migrations");

async function main() {
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  log.step(`Running ${files.length} migration(s)`);
  for (const f of files) {
    const sql = await readFile(join(migrationsDir, f), "utf8");
    await query(sql);
    log.info(`applied ${f}`);
  }
  log.info("migrations complete");
  await closeDb();
}

main().catch((e) => {
  log.error(e);
  process.exit(1);
});
