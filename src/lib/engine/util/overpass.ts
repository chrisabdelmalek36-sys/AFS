import { config } from "../config";
import { log } from "./logger";
import type { OsmElement } from "../sources/osmPlaces";

// Resilient Overpass client. The public overpass-api.de instance frequently
// returns 429 (rate limited) / 504 (timeout), which used to surface to the
// user as a misleading "no match". We now retry and fall back across several
// public mirrors, and throw a clear error only when ALL of them fail — so the
// caller can distinguish "OSM is busy" from "genuinely no results".

const MIRRORS: string[] = [
  ...new Set(
    [
      process.env.OVERPASS_URL,
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
      "https://overpass.openstreetmap.ru/api/interpreter",
    ].filter((u): u is string => !!u),
  ),
];

export class OverpassError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Runs one Overpass QL query, returning its elements. Tries each mirror in
// turn (one shot each) until one answers; throws OverpassError if every mirror
// is unavailable. `deadline` (absolute ms) bounds total time so callers stay
// inside the serverless function limit.
export async function overpassFetch(
  ql: string,
  opts: { perTryMs?: number; deadline?: number } = {},
): Promise<OsmElement[]> {
  const perTryMs = opts.perTryMs ?? 15_000;
  const deadline = opts.deadline ?? Date.now() + perTryMs * 3;
  const body = `data=${encodeURIComponent(ql)}`;
  let lastErr = "all overpass mirrors unavailable";

  for (const url of MIRRORS) {
    if (Date.now() > deadline - 1_000) break;
    const budget = Math.min(perTryMs, deadline - Date.now());
    if (budget < 2_000) break;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": config.enrich.userAgent,
        },
        body,
        signal: AbortSignal.timeout(budget),
      });
      if ([429, 503, 504].includes(r.status)) {
        lastErr = `overpass ${r.status} (busy)`;
        await sleep(200);
        continue; // next mirror
      }
      if (!r.ok) {
        lastErr = `overpass http ${r.status}`;
        continue; // next mirror
      }
      const j = (await r.json()) as { elements?: OsmElement[] };
      return j.elements ?? [];
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "overpass fetch failed";
      log.warn(`Overpass mirror failed (${url}): ${lastErr}`);
    }
  }
  throw new OverpassError(lastErr);
}
