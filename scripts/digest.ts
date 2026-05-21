import { runDigest } from "../src/lib/engine/digest-builder";
import { closeDb } from "../src/lib/db";
import { log } from "../src/lib/engine/util/logger";

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
