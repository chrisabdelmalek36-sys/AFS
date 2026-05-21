import { runPipeline } from "../src/lib/engine/pipeline";
import { config, type PipelineMode } from "../src/lib/engine/config";
import { closeDb } from "../src/lib/db";
import { log } from "../src/lib/engine/util/logger";

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
