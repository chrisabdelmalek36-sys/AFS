// Freshness score 0..100. Higher = act sooner.
// A lead backed by a recent project/expansion news item is hottest;
// a directory listing decays slowly from a neutral baseline.

export interface FreshnessInput {
  source: string;            // google_places | newsapi | gdelt | gov_tender | sample
  publishedAt?: string | null; // ISO, for news/tender items
  newsHot?: boolean;
  isNew?: boolean;           // first time we ever see this lead
}

export function freshnessScore(i: FreshnessInput): number {
  let s = 50;

  if (i.isNew) s += 15;

  if (i.source === "newsapi" || i.source === "gdelt" || i.source === "gov_tender") {
    s += 25;
    if (i.newsHot) s += 15;
    if (i.publishedAt) {
      const ageDays =
        (Date.now() - new Date(i.publishedAt).getTime()) / 86_400_000;
      if (ageDays <= 3) s += 10;
      else if (ageDays <= 14) s += 4;
      else if (ageDays > 60) s -= 15;
    }
  }

  if (i.source === "google_places") s += 5;

  return Math.max(0, Math.min(100, Math.round(s)));
}
