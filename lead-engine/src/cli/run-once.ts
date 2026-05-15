import { runPipeline } from "../pipeline/run.js";
import { config, type PipelineMode } from "../config.js";
import { closeDb } from "../db/client.js";
import { log } from "../lib/logger.js";

const arg = process.argv.find((a) => a.startsWith("--mode="));
const mode: PipelineMode = arg
  ? (arg.split("=")[1] === "live" ? "live" : "sample")
  : config.mode;

runPipeline(mode)
  .then(async () => {
    await closeDb();
  })
  .catch(async (e) => {
    log.error(e);
    await closeDb();
    process.exit(1);
  });
