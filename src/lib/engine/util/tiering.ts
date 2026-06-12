// Tiering rules (from the AFS brief).
//  Platinum: 5-star hotels, top-20 developers, major F&B groups,
//            minister/royal villa owners.        Deal 1M+ EGP.
//  Gold:     4-star hotels, mid-tier developers, established
//            restaurants, intl school chains,
//            private universities.                Deal 300K–1M EGP.
//  Silver:   3-star+, single-venue F&B, residential
//            compounds, public schools.           Deal 100K–300K EGP.

export type Tier = "Platinum" | "Gold" | "Silver" | "Unrated";

// Egypt's largest developers — any hit ⇒ Platinum.
const TOP_DEVELOPERS = [
  "emaar", "sodic", "palm hills", "tatweer misr", "hassan allam",
  "orascom", "mountain view", "madinet masr", "talaat moustafa", "tmg",
  "ora developers", "city edge", "misr italia", "marakez",
];

// Well-known F&B groups operating premium venues in Egypt.
const MAJOR_FNB_GROUPS = [
  "the grill", "zooba", "kazoku", "left bank", "crimson", "sachi",
  "din tai", "izakaya", "nine group", "table d", "longchamps",
];

const FIVE_STAR_BRANDS = [
  "four seasons", "ritz", "ritz-carlton", "st regis", "st. regis",
  "kempinski", "fairmont", "sofitel", "movenpick", "mövenpick",
  "steigenberger", "rixos", "hilton", "marriott", "jw marriott",
  "hyatt", "intercontinental", "waldorf", "raffles", "address",
  "baron", "sunrise", "albatros", "stella di mare",
];

const FOUR_STAR_HINT = /\b(4[\s-]?star|four[\s-]?star|premier|grand)\b/i;
const FIVE_STAR_HINT = /\b(5[\s-]?star|five[\s-]?star|luxury|royal|palace)\b/i;

const INTL_SCHOOL_HINT =
  /\b(international school|british school|american school|ig school|igcse|deutsche schule|lycee|lycée)\b/i;

export interface TierInput {
  name: string;
  category?: string | null;
  rating?: number | null;
  userRatings?: number | null;
  priceLevel?: number | null; // 0..4 (Google)
  newsHot?: boolean;
  // OSM signals.
  stars?: number | null;        // hotel star rating
  outdoorSeating?: boolean;     // terrace/garden — prime furniture fit
  hasWebsite?: boolean;         // established business
}

export interface TierResult {
  tier: Tier;
  reason: string;
  dealMinEgp: number;
  dealMaxEgp: number;
}

const has = (hay: string, needles: string[]) =>
  needles.some((n) => hay.includes(n));

export function classify(input: TierInput): TierResult {
  const n = input.name.toLowerCase();
  const cat = (input.category ?? "").toLowerCase();
  const rating = input.rating ?? 0;
  const reviews = input.userRatings ?? 0;
  const price = input.priceLevel ?? 0;
  const stars = input.stars ?? 0;
  const outdoor = !!input.outdoorSeating;

  // A clubhouse/compound named after its developer is still the amenity,
  // not the developer HQ — keep it Silver (spec: residential compounds).
  if (cat.includes("compound") || cat.includes("clubhouse"))
    return input.newsHot
      ? gold("Compound with active project in the news")
      : silver("Residential compound / clubhouse");

  // ── Platinum ──
  if (has(n, TOP_DEVELOPERS))
    return plat(`Top-20 Egyptian developer (${matched(n, TOP_DEVELOPERS)})`);
  if (has(n, MAJOR_FNB_GROUPS))
    return plat(`Major F&B group (${matched(n, MAJOR_FNB_GROUPS)})`);
  if ((cat.includes("hotel") || cat.includes("resort")) &&
      (has(n, FIVE_STAR_BRANDS) || FIVE_STAR_HINT.test(n) || stars >= 5 ||
       (rating >= 4.5 && reviews >= 800 && price >= 3)))
    return plat(stars >= 5 ? "5-star hotel (OSM)" : "5-star / luxury hospitality signal");

  // ── Gold ──
  if ((cat.includes("hotel") || cat.includes("resort")) &&
      (FOUR_STAR_HINT.test(n) || stars === 4 || (rating >= 4.2 && reviews >= 250)))
    return gold(stars === 4 ? "4-star hotel (OSM)" : "4-star hotel / strong hospitality signal");
  // A sit-down venue with an outdoor terrace is a prime outdoor-furniture fit.
  if ((cat.includes("restaurant") || cat.includes("cafe")) &&
      outdoor && (input.hasWebsite || rating >= 4.3))
    return gold("Restaurant/cafe with outdoor terrace + web presence");
  if (cat.includes("developer"))
    return gold("Mid-tier real estate developer");
  if (cat.includes("university"))
    return gold("Private / major university campus");
  if (cat.includes("school") && INTL_SCHOOL_HINT.test(n))
    return gold("International school chain");
  if ((cat.includes("restaurant") || cat.includes("cafe")) &&
      rating >= 4.3 && reviews >= 400)
    return gold("Established premium restaurant");
  if (input.newsHot)
    return gold("Active project / expansion in the news");

  // ── Silver ──
  if (cat.includes("hotel") || cat.includes("resort"))
    return silver("3-star+ hospitality");
  if (cat.includes("restaurant") || cat.includes("cafe"))
    return silver(
      outdoor
        ? "F&B venue with outdoor seating"
        : input.hasWebsite
          ? "Established single-venue F&B"
          : "Single-venue F&B",
    );
  if (cat.includes("compound"))
    return silver("Residential compound / clubhouse");
  if (cat.includes("school"))
    return silver("School (public/private)");
  if (cat.includes("architecture") || cat.includes("interior") ||
      cat.includes("hospital") || cat.includes("country_club") ||
      cat.includes("club"))
    return silver("Qualified institutional buyer");

  return { tier: "Unrated", reason: "No tiering rule matched", dealMinEgp: 0, dealMaxEgp: 0 };
}

function matched(hay: string, needles: string[]) {
  return needles.find((x) => hay.includes(x)) ?? "";
}
const plat = (reason: string): TierResult =>
  ({ tier: "Platinum", reason, dealMinEgp: 1_000_000, dealMaxEgp: 5_000_000 });
const gold = (reason: string): TierResult =>
  ({ tier: "Gold", reason, dealMinEgp: 300_000, dealMaxEgp: 1_000_000 });
const silver = (reason: string): TierResult =>
  ({ tier: "Silver", reason, dealMinEgp: 100_000, dealMaxEgp: 300_000 });
