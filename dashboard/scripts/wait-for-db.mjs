// Waits until the database is reachable AND the engine has created the
// leads table, so the dashboard never shows an error on first launch.
import pg from "pg";

const url =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/afs_leads";

const deadline = Date.now() + 5 * 60 * 1000; // give up after 5 minutes

async function ready() {
  const c = new pg.Client({ connectionString: url });
  try {
    await c.connect();
    await c.query("SELECT 1 FROM leads LIMIT 1");
    return true;
  } catch {
    return false;
  } finally {
    await c.end().catch(() => {});
  }
}

for (let i = 1; ; i++) {
  if (await ready()) {
    console.log("Database ready — starting dashboard.");
    process.exit(0);
  }
  if (Date.now() > deadline) {
    console.error("Database not ready after 5 minutes — starting anyway.");
    process.exit(0);
  }
  console.log(`Waiting for the engine to prepare the database… (${i})`);
  await new Promise((r) => setTimeout(r, 3000));
}
