import { config, GEO_ZONES } from "../config";
import { log } from "../util/logger";
import type { DiscoverContext, RawLead, Source } from "./types";

// OpenStreetMap Overpass API — FREE, no key, no card. Pulls real businesses
// across Egypt (hotels, resorts, restaurants, schools, universities,
// hospitals, etc.) by tags. The same kind of data Google Maps has, just
// crowd-sourced.
const OVERPASS_URL =
  process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";

interface OsmTags {
  [k: string]: string;
}
interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: OsmTags;
}

interface CategoryQuery {
  key: string; // matches our config.CATEGORIES[].key
  selectors: string[]; // OSM tag selectors
}

const CATEGORY_QUERIES: CategoryQuery[] = [
  { key: "hotel",       selectors: ['"tourism"="hotel"', '"tourism"="motel"'] },
  { key: "resort",      selectors: ['"tourism"="resort"', '"leisure"="resort"'] },
  { key: "restaurant",  selectors: ['"amenity"="restaurant"'] },
  { key: "cafe",        selectors: ['"amenity"="cafe"'] },
  { key: "school",      selectors: ['"amenity"="school"'] },
  { key: "university",  selectors: ['"amenity"="university"', '"amenity"="college"'] },
  { key: "hospital",    selectors: ['"amenity"="hospital"', '"amenity"="clinic"'] },
  { key: "country_club", selectors: ['"leisure"="sports_centre"', '"leisure"="golf_course"'] },
  { key: "developer",   selectors: ['"office"="estate_agent"', '"office"="company"'] },
  { key: "architecture", selectors: ['"office"="architect"'] },
  { key: "interior_design", selectors: ['"shop"="interior_decoration"'] },
];

function buildQuery(lat: number, lng: number, radiusM: number, sels: string[]): string {
  const around = `(around:${radiusM},${lat},${lng})`;
  const lines = sels
    .flatMap((s) => [`node[${s}]${around};`, `way[${s}]${around};`])
    .join("");
  return `[out:json][timeout:30];(${lines});out center tags 200;`;
}

function tagOr(t: OsmTags | undefined, ...keys: string[]): string | undefined {
  if (!t) return undefined;
  for (const k of keys) if (t[k]) return t[k];
  return undefined;
}

function toLead(el: OsmElement, categoryKey: string, region: string): RawLead | null {
  const t = el.tags ?? {};
  const name = t["name:en"] ?? t["name"];
  if (!name) return null;
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  const addrParts = [
    t["addr:housenumber"],
    t["addr:street"],
    t["addr:city"],
    t["addr:state"],
    t["addr:country"],
  ].filter(Boolean);
  return {
    name,
    category: categoryKey,
    subCategory: tagOr(t, "tourism", "amenity", "leisure", "office", "shop", "craft"),
    address: addrParts.join(", ") || undefined,
    city: t["addr:city"],
    region,
    lat,
    lng,
    phone: tagOr(t, "phone", "contact:phone"),
    website: tagOr(t, "website", "contact:website", "url"),
    email: tagOr(t, "email", "contact:email"),
    source: "osm",
    sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    raw: { osm_id: el.id, osm_type: el.type, tags: t },
  };
}

export const osmPlacesSource: Source = {
  name: "osm",
  async discover(ctx: DiscoverContext): Promise<RawLead[]> {
    const out: RawLead[] = [];
    let queries = 0;
    const zones = [...GEO_ZONES].sort((a, b) => a.priority - b.priority);

    for (const z of zones) {
      for (const cq of CATEGORY_QUERIES) {
        const body = `data=${encodeURIComponent(
          buildQuery(z.lat, z.lng, z.radiusM, cq.selectors),
        )}`;
        try {
          const r = await fetch(OVERPASS_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": config.enrich.userAgent,
            },
            body,
            signal: AbortSignal.timeout(45_000),
          });
          if (!r.ok) {
            log.warn(`Overpass ${r.status} for ${z.key}/${cq.key}`);
            continue;
          }
          const j = (await r.json()) as { elements?: OsmElement[] };
          for (const el of j.elements ?? []) {
            const lead = toLead(el, cq.key, z.region);
            if (lead) out.push(lead);
          }
          queries++;
          // Be a good citizen on the public Overpass instance.
          await new Promise((res) => setTimeout(res, 800));
        } catch (e) {
          log.warn(`Overpass failed (${z.key}/${cq.key}):`, e);
        }
      }
    }

    await ctx.budget.record("osm", queries, 0);
    log.info(`OSM Overpass: ${queries} queries, ${out.length} raw results`);
    return out;
  },
};
