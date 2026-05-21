import { runDigest } from "../digest/digest.js";
import { closeDb } from "../db/client.js";
import { log } from "../lib/logger.js";

runDigest()
  .then(async (r) => {
    log.info("Digest complete:", JSON.stringify(r));
    await closeDb();
  })
  .catch(async (e) => {
    log.error(e);
    await closeDb();
    process.exit(1);
  });
