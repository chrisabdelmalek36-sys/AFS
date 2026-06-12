// Relevance filter: AFS sells premium Italian outdoor furniture (avg deal
// EGP 200K–5M). Street-food and cheap-eats spots (koshari, foul, ta3meya,
// shawarma carts…) and fast-food chains are never buyers, so they're dropped
// at ingest. Keep the blocklist in sync with db/migrations/010 (same regex).

// Word-boundary-ish regex covering Arabic script + common transliterations.
export const IRRELEVANT_NAME_RE = new RegExp(
  [
    // Egyptian street food / cheap eats
    "kosh?[ae]r[iy]", "kushari", "كشري",
    "\\bfoul\\b", "\\bfool\\b", "\\bful\\b", "\\bfuul\\b", "فول",
    "ta+[3a]?me+y+a", "falafel", "طعمية", "فلافل",
    "shawe?rma", "شاورما",
    "hawawshi", "حواوشي",
    "\\bkebda\\b", "\\bkibda\\b", "كبدة",
    "f[ei]te+r", "fatatr[iy]", "فطير",
    "\\bkoshk\\b", "\\bkiosk\\b", "كشك",
    "street ?food", "take ?away", "\\bsnack\\b",
    // Fast-food chains (per-branch outlets, not B2B furniture buyers)
    "mcdonald", "\\bkfc\\b", "burger king", "hardee", "pizza hut",
    "domino'?s", "\\bsubway\\b", "papa john",
  ].join("|"),
  "i",
);

// Only food venues get name-screened — a hotel or developer with an odd name
// is still a real prospect.
const SCREENED_CATEGORIES = new Set(["restaurant", "cafe"]);

export function isRelevantBusiness(
  name: string,
  category?: string | null,
): boolean {
  if (!category || !SCREENED_CATEGORIES.has(category)) return true;
  return !IRRELEVANT_NAME_RE.test(name);
}

// Names that signal an upscale / sit-down venue worth approaching.
const PREMIUM_NAME_RE =
  /grill|rooftop|lounge|bistro|brasserie|steak|sushi|italian|french|seafood|terrace|garden|gourmet|fine\s?dining|trattoria|ristorante|club|resort|hotel|nile|marina|beach/i;

export interface ProspectSignals {
  hasWebsite?: boolean;
  hasPhone?: boolean;
  outdoorSeating?: boolean;
  stars?: number;
  fastFood?: boolean;
}

// A genuine potential client (vs. a nameless OSM pin). Hotels, resorts,
// developers, schools, clubs, hospitals etc. are institutional buyers and
// always qualify. Restaurants/cafes — the noisy categories — must show at
// least one real-business signal and must not be fast food.
export function isQualityProspect(
  name: string,
  category: string | null | undefined,
  s: ProspectSignals,
): boolean {
  if (!category || !SCREENED_CATEGORIES.has(category)) return true;
  if (s.fastFood) return false;
  return !!(
    s.hasWebsite ||
    s.hasPhone ||
    s.outdoorSeating ||
    (s.stars ?? 0) > 0 ||
    PREMIUM_NAME_RE.test(name)
  );
}
