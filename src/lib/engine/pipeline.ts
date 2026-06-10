import { config } from "./config";
import { query } from "../db";
import { log } from "./util/logger";
import { BudgetGuard } from "./util/budget";
import { ingestRawLeads } from "./ingest";
import type { RawLead, Source } from "./sources/types";
import { sampleSource } from "./sources/sampleData";
import { osmPlacesSource } from "./sources/osmPlaces";
import { googlePlacesSource } from "./sources/googlePlaces";
import { newsSource } from "./sources/news";
import { govTenderSource } from "./sources/govTenders";

function pickSources(mode: string): Source[] {
  if (mode === "sample") return [sampleSource];
  // OSM is the FREE primary source (real businesses, no key). Google Places
  // skips itself if no key. News + gov work without keys (GDELT free).
  return [osmPlacesSource, googlePlacesSource, newsSource, govTenderSource];
}

export interface RunResult {
  runId: number;
  mode: string;
  rawCount: number;
  mergedCount: number;
  inserted: number;
  updated: number;
  suppressed: number;
  estCostUsd: number;
  status: string;
}

export async function runPipeline(mode = config.mode): Promise<RunResult> {
  const runRow = await query<{ id: number }>(
    `INSERT INTO crawl_runs (mode) VALUES ($1) RETURNING id`,
    [mode],
  );
  const runId = runRow.rows[0]!.id;
  const budget = new BudgetGuard(runId);
  await budget.init();

  log.step(`Pipeline run #${runId} (mode=${mode})`);

  // 1. Discover
  const sources = pickSources(mode);
  const raw: RawLead[] = [];
  for (const s of sources) {
    try {
      raw.push(...(await s.discover({ runId, budget })));
    } catch (e) {
      log.error(`source ${s.name} failed:`, e);
    }
  }
  log.info(`Discovered ${raw.length} raw leads from ${sources.length} source(s)`);

  // 2. Dedupe + enrich + tier + store (shared with the zone scanner).
  const { stats } = await ingestRawLeads(raw, { enrich: mode === "live" });

  const status = budget.remaining() <= 0 ? "budget_capped" : "ok";
  await query(
    `UPDATE crawl_runs
        SET finished_at=now(), status=$2, stats=$3 WHERE id=$1`,
    [runId, status, JSON.stringify(stats)],
  );

  const result: RunResult = {
    runId,
    mode,
    ...stats,
    estCostUsd: Number(budget.runSpent().toFixed(4)),
    status,
  };
  log.step("Run summary");
  log.info(JSON.stringify(result, null, 2));
  return result;
}
