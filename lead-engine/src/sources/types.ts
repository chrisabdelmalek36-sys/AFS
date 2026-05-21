// Every source adapter normalizes its results into RawLead[] before the
// pipeline dedupes / tiers / stores them.

export interface RawLead {
  name: string;
  category?: string;       // our Category.key
  subCategory?: string;
  address?: string;
  city?: string;
  region?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  website?: string;
  email?: string;
  contactPerson?: string;

  googlePlaceId?: string;
  rating?: number;
  userRatings?: number;
  priceLevel?: number;

  source: string;          // google_places | newsapi | gdelt | gov_tender | sample
  sourceUrl?: string;
  publishedAt?: string;    // ISO, for news/tender items
  newsHot?: boolean;       // project/expansion announcement
  raw?: Record<string, unknown>;
}

export interface DiscoverContext {
  runId: number;
  budget: import("../lib/budget.js").BudgetGuard;
}

export interface Source {
  name: string;
  discover(ctx: DiscoverContext): Promise<RawLead[]>;
}
