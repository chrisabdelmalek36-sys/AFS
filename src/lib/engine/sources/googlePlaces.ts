import { config, CATEGORIES, GEO_ZONES } from "../config";
import { log } from "../util/logger";
import type { DiscoverContext, RawLead, Source } from "./types";

const ENDPOINT_NEARBY = "https://places.googleapis.com/v1/places:searchNearby";
const ENDPOINT_TEXT = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.primaryType",
].join(",");

interface GPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string; // PRICE_LEVEL_EXPENSIVE etc
  primaryType?: string;
}

const PRICE_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

async function callPlaces(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<GPlace[]> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": config.google.apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    log.warn(`Places API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return [];
  }
  const json = (await res.json()) as { places?: GPlace[] };
  return json.places ?? [];
}

function toRawLead(p: GPlace, categoryKey: string, region: string): RawLead {
  return {
    name: p.displayName?.text ?? "(unknown)",
    category: categoryKey,
    subCategory: p.primaryType,
    address: p.formattedAddress,
    region,
    lat: p.location?.latitude,
    lng: p.location?.longitude,
    phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber,
    website: p.websiteUri,
    googlePlaceId: p.id,
    rating: p.rating,
    userRatings: p.userRatingCount,
    priceLevel: p.priceLevel ? PRICE_MAP[p.priceLevel] : undefined,
    source: "google_places",
    sourceUrl: `https://www.google.com/maps/place/?q=place_id:${p.id}`,
    raw: { primaryType: p.primaryType },
  };
}

export const googlePlacesSource: Source = {
  name: "google_places",
  async discover(ctx: DiscoverContext): Promise<RawLead[]> {
    if (!config.google.apiKey) {
      log.warn("GOOGLE_MAPS_API_KEY missing — skipping Google Places source");
      return [];
    }
    const costPerCall = config.google.placesCostPer1k / 1000;
    const out: RawLead[] = [];
    let calls = 0;

    const zones = [...GEO_ZONES].sort((a, b) => a.priority - b.priority);
    outer: for (const z of zones) {
      for (const cat of CATEGORIES) {
        if (calls >= config.google.maxCallsPerRun) {
          log.info(`Reached MAX_PLACES_CALLS_PER_RUN (${calls}) — stopping`);
          break outer;
        }
        if (!ctx.budget.canSpend(costPerCall)) {
          log.warn("Monthly budget cap reached — stopping Google Places");
          break outer;
        }
        try {
          let places: GPlace[];
          if (cat.placeTypes.length > 0) {
            places = await callPlaces(ENDPOINT_NEARBY, {
              includedTypes: cat.placeTypes,
              maxResultCount: 20,
              locationRestriction: {
                circle: {
                  center: { latitude: z.lat, longitude: z.lng },
                  radius: z.radiusM,
                },
              },
            });
          } else {
            places = await callPlaces(ENDPOINT_TEXT, {
              textQuery: `${cat.keywords[0]} in ${z.label}, Egypt`,
              maxResultCount: 20,
              locationBias: {
                circle: {
                  center: { latitude: z.lat, longitude: z.lng },
                  radius: z.radiusM,
                },
              },
            });
          }
          calls++;
          await ctx.budget.record("google_places", 1, costPerCall);
          for (const p of places) out.push(toRawLead(p, cat.key, z.region));
        } catch (e) {
          log.warn(`Places call failed (${z.key}/${cat.key}):`, e);
        }
      }
    }
    log.info(`Google Places: ${calls} calls, ${out.length} raw results`);
    return out;
  },
};
