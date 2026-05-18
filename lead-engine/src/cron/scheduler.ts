import cron from "node-cron";
import { config } from "../config.js";
import { runPipeline } from "../pipeline/run.js";
import { processOutreachQueue } from "../outreach/sender.js";
import { log } from "../lib/logger.js";

// Long-running worker: runs the discovery pipeline every day on schedule
// (default 06:00 Africa/Cairo). Keep this process alive on your server.
log.step(`AFS Lead Engine cron — schedule "${config.cron}" TZ=${config.tz}`);
log.info(`mode=${config.mode}  budget cap=$${config.monthlyBudgetUsd}/mo`);

cron.schedule(
  config.cron,
  async () => {
    log.step("Scheduled daily run starting");
    try {
      await runPipeline();
    } catch (e) {
      log.error("scheduled run failed:", e);
    }
  },
  { timezone: config.tz },
);

// Process the email outreach sequence regularly (default every 30 min).
cron.schedule(
  config.outreachCron,
  async () => {
    try {
      await processOutreachQueue();
    } catch (e) {
      log.error("outreach queue failed:", e);
    }
  },
  { timezone: config.tz },
);

log.info(
  `Outreach queue schedule "${config.outreachCron}" ` +
    `(liveSend=${config.outreach.liveSend})`,
);
log.info("Scheduler armed. Waiting for next run… (Ctrl+C to stop)");
