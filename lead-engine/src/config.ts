import "dotenv/config";

function num(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}
function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  return v === "true" || v === "1" || v === "yes";
}

export type PipelineMode = "sample" | "live";

export const config = {
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/afs_leads",
  mode: (process.env.PIPELINE_MODE === "live" ? "live" : "sample") as PipelineMode,

  monthlyBudgetUsd: num("MONTHLY_BUDGET_USD", 200),

  google: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
    placesCostPer1k: num("GOOGLE_PLACES_COST_PER_1K", 32),
    detailsCostPer1k: num("GOOGLE_PLACE_DETAILS_COST_PER_1K", 17),
    maxCallsPerRun: num("MAX_PLACES_CALLS_PER_RUN", 120),
  },

  news: {
    newsApiKey: process.env.NEWSAPI_KEY ?? "",
    gdeltEnabled: bool("GDELT_ENABLED", true),
  },

  enrich: {
    websiteEmails: bool("ENRICH_WEBSITE_EMAILS", true),
    respectRobots: bool("RESPECT_ROBOTS_TXT", true),
    userAgent:
      process.env.HTTP_USER_AGENT ??
      "AFS-LeadEngine/1.0 (+contact: info@afstrade.example)",
  },

  outreach: {
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    fromEmail: process.env.AFS_FROM_EMAIL ?? "sales@afstrade.example",
    // Real emails are sent ONLY when this is explicitly true AND a Resend
    // key is present. Otherwise every send is safely simulated.
    liveSend: bool("OUTREACH_LIVE_SEND", false),
  },

  cron: process.env.DAILY_CRON ?? "0 6 * * *",
  outreachCron: process.env.OUTREACH_CRON ?? "*/30 * * * *",
  tz: process.env.TZ ?? "Africa/Cairo",
};

// ── Target customer categories (Nardi premium outdoor furniture buyers) ──
// Each maps to Google Places "includedTypes" (Places API New) + keyword hints.
export interface Category {
  key: string;
  label: string;
  placeTypes: string[];
  keywords: string[];
}

export const CATEGORIES: Category[] = [
  { key: "hotel", label: "Hotel", placeTypes: ["hotel", "lodging"], keywords: ["hotel", "5 star", "resort hotel"] },
  { key: "resort", label: "Resort", placeTypes: ["resort_hotel"], keywords: ["resort", "beach resort"] },
  { key: "restaurant", label: "Restaurant", placeTypes: ["restaurant", "fine_dining_restaurant"], keywords: ["restaurant", "lounge", "rooftop"] },
  { key: "cafe", label: "Cafe", placeTypes: ["cafe", "coffee_shop"], keywords: ["cafe", "coffee"] },
  { key: "developer", label: "Real Estate Developer", placeTypes: ["real_estate_agency"], keywords: ["developments", "developer", "real estate development", "compound"] },
  { key: "architecture", label: "Architecture Firm", placeTypes: ["general_contractor"], keywords: ["architecture", "architects", "consultants"] },
  { key: "interior_design", label: "Interior Design Studio", placeTypes: [], keywords: ["interior design", "design studio", "fit out"] },
  { key: "school", label: "School", placeTypes: ["school", "primary_school", "secondary_school"], keywords: ["international school", "school"] },
  { key: "university", label: "University", placeTypes: ["university"], keywords: ["university", "campus"] },
  { key: "hospital", label: "Hospital", placeTypes: ["hospital"], keywords: ["hospital", "medical center"] },
  { key: "country_club", label: "Country / Sporting Club", placeTypes: ["golf_course", "sports_club"], keywords: ["country club", "sporting club", "golf"] },
  { key: "compound", label: "Compound / Clubhouse", placeTypes: [], keywords: ["compound clubhouse", "residential compound", "gated community"] },
];

// ── Geo zones covering all of Egypt. Crawler scans these in priority order;
// the budget cap decides how far down the list a single day reaches. ──
export interface GeoZone {
  key: string;
  label: string;
  region: string;
  lat: number;
  lng: number;
  radiusM: number;
  priority: number; // lower = scanned first
}

export const GEO_ZONES: GeoZone[] = [
  { key: "cairo",        label: "Greater Cairo",            region: "Greater Cairo",   lat: 30.0444, lng: 31.2357, radiusM: 25000, priority: 1 },
  { key: "new_capital",  label: "New Administrative Capital", region: "New Capital",    lat: 30.0131, lng: 31.7400, radiusM: 20000, priority: 1 },
  { key: "giza_sheikh_zayed", label: "Giza / Sheikh Zayed", region: "Greater Cairo",   lat: 30.0420, lng: 30.9760, radiusM: 18000, priority: 1 },
  { key: "new_cairo",    label: "New Cairo / 5th Settlement", region: "Greater Cairo", lat: 30.0080, lng: 31.4360, radiusM: 15000, priority: 1 },
  { key: "el_gouna",     label: "El Gouna",                 region: "Red Sea",         lat: 27.3940, lng: 33.6780, radiusM: 12000, priority: 2 },
  { key: "hurghada",     label: "Hurghada",                 region: "Red Sea",         lat: 27.2579, lng: 33.8116, radiusM: 18000, priority: 2 },
  { key: "sahl_hasheesh",label: "Sahl Hasheesh",            region: "Red Sea",         lat: 27.0540, lng: 33.8920, radiusM: 10000, priority: 2 },
  { key: "soma_bay",     label: "Soma Bay",                 region: "Red Sea",         lat: 26.8430, lng: 33.9930, radiusM: 9000,  priority: 2 },
  { key: "sahel",        label: "North Coast (Sahel)",      region: "North Coast",     lat: 30.9700, lng: 28.9300, radiusM: 30000, priority: 2 },
  { key: "ras_el_hekma", label: "Ras El Hekma",             region: "North Coast",     lat: 31.1300, lng: 27.8000, radiusM: 18000, priority: 2 },
  { key: "new_alamein",  label: "New Alamein",              region: "North Coast",     lat: 30.8270, lng: 28.9530, radiusM: 12000, priority: 2 },
  { key: "sharm",        label: "Sharm El Sheikh",          region: "South Sinai",     lat: 27.9158, lng: 34.3300, radiusM: 18000, priority: 3 },
  { key: "dahab",        label: "Dahab",                    region: "South Sinai",     lat: 28.5091, lng: 34.5136, radiusM: 8000,  priority: 3 },
  { key: "alexandria",   label: "Alexandria",               region: "Alexandria",      lat: 31.2001, lng: 29.9187, radiusM: 22000, priority: 3 },
  { key: "luxor",        label: "Luxor",                    region: "Upper Egypt",     lat: 25.6872, lng: 32.6396, radiusM: 12000, priority: 4 },
  { key: "aswan",        label: "Aswan",                    region: "Upper Egypt",     lat: 24.0889, lng: 32.8998, radiusM: 12000, priority: 4 },
];
