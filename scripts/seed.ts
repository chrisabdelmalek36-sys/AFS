import { query, closeDb } from "../src/lib/db";
import { normalizePhone } from "../src/lib/engine/util/dedup";
import { log } from "../src/lib/engine/util/logger";

// Seeds one do-not-contact entry so the sample run can PROVE suppression.
// Matches "Do Not Contact Test Café" (+20 1111 999000) in sampleData.ts.
async function main() {
  const phone = normalizePhone("+20 1111 999000");
  const exists = await query(
    `SELECT 1 FROM do_not_contact WHERE phone_norm=$1`,
    [phone],
  );
  if (exists.rowCount === 0) {
    await query(
      `INSERT INTO do_not_contact (phone_norm, channel, reason)
       VALUES ($1, 'all', 'Replied STOP — demo suppression record')`,
      [phone],
    );
    log.info(`Seeded do-not-contact: ${phone}`);
  } else {
    log.info("do-not-contact seed already present");
  }
  await closeDb();
}

main().catch((e) => {
  log.error(e);
  process.exit(1);
});
