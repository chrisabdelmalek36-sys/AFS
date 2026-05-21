import { processOutreachQueue } from "../src/lib/engine/sender";
import { closeDb } from "../src/lib/db";
import { log } from "../src/lib/engine/util/logger";

processOutreachQueue()
  .then(async (r) => {
    log.info("Outreach run complete:", JSON.stringify(r));
    await closeDb();
  })
  .catch(async (e) => {
    log.error(e);
    await closeDb();
    process.exit(1);
  });
