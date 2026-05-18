import { processOutreachQueue } from "../outreach/sender.js";
import { closeDb } from "../db/client.js";
import { log } from "../lib/logger.js";

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
