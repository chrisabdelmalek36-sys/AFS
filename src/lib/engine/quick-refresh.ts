// Fast daily refresh that fits inside Vercel's 60s function ceiling.
// Pulls free news (GDELT) for hot Egyptian leads, processes the email
// outreach queue, and builds the digest. Full OSM scan is heavier and
// happens at deploy time (postbuild) or via the long-running worker.

import { query } from "../db";
import { log } from "./util/logger";
import { BudgetGuard } from "./util/budget";
import { dedupHash, normalizeName, normalizePhone } from "./util/dedup";
import { classify } from "./util/tiering";
import { freshnessScore } from "./util/freshness";
import { newsSource } from "./sources/news";
import { govTenderSource } from "./sources/govTenders";
import { processOutreachQueue } from "./sender";
import { runDigest } from "./digest-builder";
import type { RawLead } from "./sources/types";

async function persistLeads(raw: RawLead[]): Promise<{ inserted: number; updated: number }> {
  let inserted = 0,
    updated = 0;

  for (const r of raw) {
    const hash = dedupHash(r);
    const phoneNorm = normalizePhone(r.phone);
    const nameNorm = normalizeName(r.name);

    const ex = await query<{ id: number }>(
      `SELECT id FROM leads
        WHERE dedup_hash=$1
           OR (google_place_id IS NOT NULL AND google_place_id=$2)
        LIMIT 1`,
      [hash, r.googlePlaceId ?? null],
    );
    const isNew = ex.rowCount === 0;

    const t = classify({
      name: r.name,
      category: r.category,
      rating: r.rating,
      userRatings: r.userRatings,
      priceLevel: r.priceLevel,
      newsHot: r.newsHot,
    });
    const fresh = freshnessScore({
      source: r.source,
      publishedAt: r.publishedAt,
      newsHot: r.newsHot,
      isNew,
    });

    if (isNew) {
      await query(
        `INSERT INTO leads
          (dedup_hash, name, name_norm, category, address, city, region,
           lat, lng, phone, phone_norm, website, email,
           tier, tier_reason, est_deal_min_egp, est_deal_max_egp,
           freshness, source_primary, source_url, raw)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
         ON CONFLICT (dedup_hash) DO NOTHING`,
        [
          hash, r.name, nameNorm, r.category ?? null, r.address ?? null,
          r.city ?? null, r.region ?? null, r.lat ?? null, r.lng ?? null,
          r.phone ?? null, phoneNorm || null, r.website ?? null, r.email ?? null,
          t.tier, t.reason, t.dealMinEgp || null, t.dealMaxEgp || null,
          fresh, r.source, r.sourceUrl ?? null, JSON.stringify(r.raw ?? {}),
        ],
      );
      inserted++;
    } else {
      await query(
        `UPDATE leads SET
            last_seen=now(),
            freshness=GREATEST(freshness, $2)
          WHERE id=$1`,
        [ex.rows[0]!.id, fresh],
      );
      updated++;
    }
  }
  return { inserted, updated };
}

export interface QuickRefreshResult {
  newsItems: number;
  inserted: number;
  updated: number;
  outreach: { due: number; sent: number; simulated: number; skipped: number };
  digest: { status: string; to: string };
}

export async function quickRefresh(): Promise<QuickRefreshResult> {
  log.step("Quick refresh");

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

  await query(
    `UPDATE crawl_runs
        SET finished_at=now(), status='ok',
            stats=$2 WHERE id=$1`,
    [runId, JSON.stringify({ newsItems: raw.length, inserted, updated })],
  );

  return {
    newsItems: raw.length,
    inserted,
    updated,
    outreach,
    digest: { status: digest.status, to: digest.to },
  };
}
