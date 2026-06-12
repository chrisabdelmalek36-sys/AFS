// Fast daily refresh that fits inside Vercel's 60s function ceiling.
// Pulls free news (GDELT) for hot Egyptian leads, processes the email
// outreach queue, and builds the digest. Full OSM scan is heavier and
// happens at deploy time (postbuild) or via the long-running worker.

import { query } from "../db";
import { log } from "./util/logger";
import { BudgetGuard } from "./util/budget";
import { ingestRawLeads } from "./ingest";
import { newsSource } from "./sources/news";
import { govTenderSource } from "./sources/govTenders";
import { processOutreachQueue } from "./sender";
import { runDigest } from "./digest-builder";
import type { RawLead } from "./sources/types";

// Use the shared ingest so news/gov leads get the same treatment as scanned
// ones: dedupe, relevance + quality gate, do-not-contact suppression, and —
// critically — the deleted_leads guard, so a lead you deleted is never
// resurrected by the daily refresh.
async function persistLeads(raw: RawLead[]): Promise<{ inserted: number; updated: number }> {
  const { stats } = await ingestRawLeads(raw, { enrich: false });
  return { inserted: stats.inserted, updated: stats.updated };
}

export interface QuickRefreshResult {
  newsItems: number;
  inserted: number;
  updated: number;
  outreach: { due: number; sent: number; simulated: number; skipped: number };
  digest: { status: string; to: string };
  scan?: { zone: string; inserted: number; progressPct: number };
}

export async function quickRefresh(): Promise<QuickRefreshResult> {
  log.step("Quick refresh");
  // Whole cron call must fit Vercel's 60s ceiling; leftover time goes to
  // advancing the OSM business scan below.
  const deadline = Date.now() + 50_000;

  // Lightweight run record so we have an audit trail.
  const run = await query<{ id: number }>(
    `INSERT INTO crawl_runs (mode, status) VALUES ('live','running') RETURNING id`,
  );
  const runId = run.rows[0]!.id;
  const budget = new BudgetGuard(runId);
  await budget.init();

  const raw: RawLead[] = [];
  try {
    raw.push(...(await newsSource.discover({ runId, budget })));
  } catch (e) {
    log.error("news failed:", e);
  }
  try {
    raw.push(...(await govTenderSource.discover({ runId, budget })));
  } catch (e) {
    log.error("gov_tender failed:", e);
  }

  const { inserted, updated } = await persistLeads(raw);

  const outreach = await processOutreachQueue();
  const digest = await runDigest();

  // Spend whatever time is left advancing the resumable OSM business scan,
  // so real leads keep arriving daily even if nobody clicks the button.
  let scan: QuickRefreshResult["scan"];
  if (deadline - Date.now() > 15_000) {
    try {
      const { scanStep } = await import("./zone-scan");
      const s = await scanStep(deadline);
      scan = { zone: s.zoneLabel, inserted: s.inserted, progressPct: s.progressPct };
    } catch (e) {
      log.warn("zone scan step failed:", e);
    }
  }

  await query(
    `UPDATE crawl_runs
        SET finished_at=now(), status='ok',
            stats=$2 WHERE id=$1`,
    [runId, JSON.stringify({ newsItems: raw.length, inserted, updated, scan })],
  );

  return {
    newsItems: raw.length,
    inserted,
    updated,
    outreach,
    digest: { status: digest.status, to: digest.to },
    scan,
  };
}
