import { config, GEO_ZONES } from "./config";
import { query } from "../db";
import { log } from "./util/logger";
import { ingestRawLeads } from "./ingest";
import {
  OVERPASS_URL,
  CATEGORY_QUERIES,
  buildQuery,
  buildMultiQuery,
  nameSelector,
  toLead,
  type OsmElement,
} from "./sources/osmPlaces";
import { nearestArea } from "../areas";
import type { RawLead } from "./sources/types";

// Resumable OSM discovery that fits inside Vercel's 60s function ceiling.
//
// A full Egypt scan is 16 zones x 11 categories = 176 Overpass queries
// (~15 minutes) — impossible in one serverless call. Instead each call to
// scanStep() processes as many zone/category chunks as fit before the given
// deadline, then persists a cursor in app_state so the NEXT call continues
// exactly where this one stopped. The dashboard "Find real leads" button
// chains calls from the browser until the whole country is covered, and the
// daily cron advances the same cursor so data keeps refreshing on its own.

interface Cursor {
  zone: number;
  cat: number;
}

const CURSOR_KEY = "osm_scan_cursor";

async function getCursor(): Promise<Cursor> {
  const r = await query<{ value: Cursor }>(
    `SELECT value FROM app_state WHERE key=$1`,
    [CURSOR_KEY],
  );
  const v = r.rows[0]?.value;
  return v && typeof v.zone === "number" && typeof v.cat === "number"
    ? v
    : { zone: 0, cat: 0 };
}

async function saveCursor(c: Cursor): Promise<void> {
  await query(
    `INSERT INTO app_state (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
    [CURSOR_KEY, JSON.stringify(c)],
  );
}

export interface ScanStepResult {
  zoneLabel: string;
  queries: number;
  rawCount: number;
  inserted: number;
  updated: number;
  suppressed: number;
  done: boolean;        // true when a full pass over Egypt just completed
  progressPct: number;  // 0-100 over the whole pass
}

// Keep enough headroom before the platform deadline to ingest what we
// fetched and return a response.
const HEADROOM_MS = 8_000;
// Cap raw results per step so the DB ingest stays well inside the budget.
const MAX_RAW_PER_STEP = 300;

export async function scanStep(deadline: number): Promise<ScanStepResult> {
  const zones = [...GEO_ZONES].sort((a, b) => a.priority - b.priority);
  const totalChunks = zones.length * CATEGORY_QUERIES.length;

  let cur = await getCursor();
  if (cur.zone >= zones.length) cur = { zone: 0, cat: 0 };

  const runRow = await query<{ id: number }>(
    `INSERT INTO crawl_runs (mode) VALUES ('osm-scan') RETURNING id`,
  );
  const runId = runRow.rows[0]!.id;
  const zoneLabel = zones[cur.zone]!.label;

  const raw: RawLead[] = [];
  let queries = 0;

  while (
    Date.now() < deadline - HEADROOM_MS &&
    raw.length < MAX_RAW_PER_STEP &&
    cur.zone < zones.length
  ) {
    const z = zones[cur.zone]!;
    const cq = CATEGORY_QUERIES[cur.cat]!;
    const body = `data=${encodeURIComponent(
      buildQuery(z.lat, z.lng, z.radiusM, cq.selectors, 12),
    )}`;
    try {
      const r = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": config.enrich.userAgent,
        },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      if (r.ok) {
        const j = (await r.json()) as { elements?: OsmElement[] };
        for (const el of j.elements ?? []) {
          const lead = toLead(el, cq.key, z.region);
          if (lead) raw.push(lead);
        }
        queries++;
      } else {
        log.warn(`Overpass ${r.status} for ${z.key}/${cq.key}`);
      }
    } catch (e) {
      log.warn(`Overpass failed (${z.key}/${cq.key}):`, e);
    }

    // Advance the cursor even on failure so one broken chunk can't wedge
    // the whole scan; the next full pass retries it anyway.
    cur = cur.cat + 1 < CATEGORY_QUERIES.length
      ? { zone: cur.zone, cat: cur.cat + 1 }
      : { zone: cur.zone + 1, cat: 0 };

    // Be a good citizen on the public Overpass instance.
    await new Promise((res) => setTimeout(res, 250));
  }

  const stats = await ingestRawLeads(raw, { enrich: false });

  const done = cur.zone >= zones.length;
  await saveCursor(done ? { zone: 0, cat: 0 } : cur);

  if (queries > 0) {
    await query(
      `INSERT INTO api_usage (run_id, provider, calls, est_cost_usd)
       VALUES ($1, 'osm', $2, 0)`,
      [runId, queries],
    );
  }
  await query(
    `UPDATE crawl_runs SET finished_at=now(), status='ok', stats=$2 WHERE id=$1`,
    [runId, JSON.stringify({ zone: zoneLabel, queries, ...stats })],
  );

  const chunksDone = done
    ? totalChunks
    : cur.zone * CATEGORY_QUERIES.length + cur.cat;
  const result: ScanStepResult = {
    zoneLabel,
    queries,
    ...stats,
    done,
    progressPct: Math.round((chunksDone / totalChunks) * 100),
  };
  log.info(`zone scan step: ${JSON.stringify(result)}`);
  return result;
}

// Targeted, on-demand scan: pull the chosen categories (and any free-text
// types) across one or more chosen areas, in a single serverless call. Each
// category/keyword is one Overpass request whose results span every selected
// area circle at once. Used by the "Find leads" page.
export interface TargetedArea {
  key: string;
  label: string;
  group: string | null;
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface TargetedResult {
  areas: string[];
  categories: string[];
  custom: string[];
  queries: number;
  rawCount: number;
  inserted: number;
  updated: number;
  suppressed: number;
}

export async function targetedScan(opts: {
  areas: TargetedArea[];
  categories: string[];
  custom: string[];
  deadline: number;
}): Promise<TargetedResult> {
  // Search a touch wider than the tight display radius so edge venues aren't
  // missed; each lead is still tagged to its nearest area's region below.
  const centers = opts.areas.map((a) => ({
    lat: a.lat,
    lng: a.lng,
    radiusM: Math.round(Math.max(a.radiusKm, 4) * 1000),
  }));
  const fallbackGroup = opts.areas[0]?.group ?? null;

  const cats = CATEGORY_QUERIES.filter((c) => opts.categories.includes(c.key));
  const customKeywords = opts.custom
    .map((k) => k.trim())
    .filter((k) => k.length >= 2)
    .slice(0, 6);

  // One job per category + one per custom keyword.
  const jobs: { key: string; selectors: string[] }[] = [
    ...cats.map((c) => ({ key: c.key, selectors: c.selectors })),
    ...customKeywords.map((k) => ({ key: k.toLowerCase(), selectors: [nameSelector(k)] })),
  ];

  const runRow = await query<{ id: number }>(
    `INSERT INTO crawl_runs (mode) VALUES ('targeted') RETURNING id`,
  );
  const runId = runRow.rows[0]!.id;

  const raw: RawLead[] = [];
  let queries = 0;
  for (const job of jobs) {
    if (Date.now() > opts.deadline - 8_000) break;
    const body = `data=${encodeURIComponent(
      buildMultiQuery(centers, job.selectors, 25),
    )}`;
    try {
      const r = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": config.enrich.userAgent,
        },
        body,
        signal: AbortSignal.timeout(28_000),
      });
      if (r.ok) {
        const j = (await r.json()) as { elements?: OsmElement[] };
        for (const el of j.elements ?? []) {
          const lat = el.lat ?? el.center?.lat;
          const lng = el.lon ?? el.center?.lon;
          const region =
            (lat != null && lng != null ? nearestArea(lat, lng)?.group : null) ??
            fallbackGroup ??
            "Egypt";
          const lead = toLead(el, job.key, region);
          if (lead) raw.push(lead);
        }
        queries++;
      } else {
        log.warn(`Overpass ${r.status} for targeted/${job.key}`);
      }
    } catch (e) {
      log.warn(`Overpass failed (targeted/${job.key}):`, e);
    }
    await new Promise((res) => setTimeout(res, 250));
  }

  const stats = await ingestRawLeads(raw, { enrich: false });
  if (queries > 0) {
    await query(
      `INSERT INTO api_usage (run_id, provider, calls, est_cost_usd)
       VALUES ($1, 'osm', $2, 0)`,
      [runId, queries],
    );
  }
  const areaLabels = opts.areas.map((a) => a.label);
  await query(
    `UPDATE crawl_runs SET finished_at=now(), status='ok', stats=$2 WHERE id=$1`,
    [runId, JSON.stringify({ areas: areaLabels, queries, ...stats })],
  );

  return {
    areas: areaLabels,
    categories: opts.categories,
    custom: customKeywords,
    queries,
    ...stats,
  };
}
