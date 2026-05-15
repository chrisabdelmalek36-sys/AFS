import { q } from "./db";

export interface Lead {
  id: number;
  name: string;
  category: string | null;
  sub_category: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  phone_norm: string | null;
  website: string | null;
  email: string | null;
  tier: string | null;
  tier_reason: string | null;
  est_deal_min_egp: string | null;
  est_deal_max_egp: string | null;
  status: string;
  freshness: number;
  discovered_date: string;
  last_contacted_at: string | null;
  source_primary: string | null;
  source_url: string | null;
  suppressed: boolean;
  suppressed_reason: string | null;
}

export const STATUSES = [
  "New", "Contacted", "Replied", "Meeting",
  "Quote Sent", "Closed Won", "Closed Lost",
] as const;

export interface LeadFilter {
  tier?: string;
  category?: string;
  city?: string;
  region?: string;
  status?: string;
  q?: string;
}

function whereClause(f: LeadFilter): { sql: string; params: unknown[] } {
  const c: string[] = [];
  const p: unknown[] = [];
  const add = (frag: string, val: unknown) => {
    p.push(val);
    c.push(frag.replace("?", `$${p.length}`));
  };
  if (f.tier) add("tier = ?", f.tier);
  if (f.category) add("category = ?", f.category);
  if (f.city) add("city = ?", f.city);
  if (f.region) add("region = ?", f.region);
  if (f.status) add("status = ?", f.status);
  if (f.q) add("name ILIKE ?", `%${f.q}%`);
  return { sql: c.length ? `WHERE ${c.join(" AND ")}` : "", params: p };
}

export async function listLeads(f: LeadFilter = {}): Promise<Lead[]> {
  const { sql, params } = whereClause(f);
  return q<Lead>(
    `SELECT * FROM leads ${sql}
      ORDER BY suppressed ASC,
               CASE tier WHEN 'Platinum' THEN 0 WHEN 'Gold' THEN 1
                         WHEN 'Silver' THEN 2 ELSE 3 END,
               freshness DESC, id DESC
      LIMIT 1000`,
    params,
  );
}

export async function getLead(id: number): Promise<Lead | null> {
  const r = await q<Lead>(`SELECT * FROM leads WHERE id=$1`, [id]);
  return r[0] ?? null;
}

export async function distinctValues(): Promise<{
  cities: string[];
  regions: string[];
  categories: string[];
}> {
  const cities = await q<{ v: string }>(
    `SELECT DISTINCT city v FROM leads WHERE city IS NOT NULL ORDER BY 1`,
  );
  const regions = await q<{ v: string }>(
    `SELECT DISTINCT region v FROM leads WHERE region IS NOT NULL ORDER BY 1`,
  );
  const categories = await q<{ v: string }>(
    `SELECT DISTINCT category v FROM leads WHERE category IS NOT NULL ORDER BY 1`,
  );
  return {
    cities: cities.map((x) => x.v),
    regions: regions.map((x) => x.v),
    categories: categories.map((x) => x.v),
  };
}

export interface DashboardSummary {
  totalLeads: number;
  newToday: number;
  suppressed: number;
  byTier: { tier: string; n: number; pipelineMin: number; pipelineMax: number }[];
  byStatus: { status: string; n: number }[];
  followupsDue: Lead[];
  recentRuns: {
    id: number; mode: string; status: string;
    est_cost_usd: string; stats: Record<string, unknown>; started_at: string;
  }[];
  pipelineMin: number;
  pipelineMax: number;
}

export async function dashboardSummary(): Promise<DashboardSummary> {
  const [tot] = await q<{ n: string }>(`SELECT COUNT(*) n FROM leads`);
  const [today] = await q<{ n: string }>(
    `SELECT COUNT(*) n FROM leads
      WHERE discovered_date = (now() AT TIME ZONE 'Africa/Cairo')::date`,
  );
  const [sup] = await q<{ n: string }>(
    `SELECT COUNT(*) n FROM leads WHERE suppressed`,
  );
  const byTier = await q<{
    tier: string; n: string; mn: string; mx: string;
  }>(
    `SELECT COALESCE(tier,'Unrated') tier, COUNT(*) n,
            COALESCE(SUM(est_deal_min_egp),0) mn,
            COALESCE(SUM(est_deal_max_egp),0) mx
       FROM leads WHERE NOT suppressed
      GROUP BY 1
      ORDER BY CASE COALESCE(tier,'Unrated')
                 WHEN 'Platinum' THEN 0 WHEN 'Gold' THEN 1
                 WHEN 'Silver' THEN 2 ELSE 3 END`,
  );
  const byStatus = await q<{ status: string; n: string }>(
    `SELECT status, COUNT(*) n FROM leads WHERE NOT suppressed
      GROUP BY 1 ORDER BY 1`,
  );
  const followupsDue = await q<Lead>(
    `SELECT * FROM leads
      WHERE NOT suppressed
        AND status IN ('Contacted','Replied','Meeting','Quote Sent')
        AND (last_contacted_at IS NULL
             OR last_contacted_at < now() - interval '7 days')
      ORDER BY last_contacted_at NULLS FIRST
      LIMIT 25`,
  );
  const recentRuns = await q<{
    id: number; mode: string; status: string;
    est_cost_usd: string; stats: Record<string, unknown>; started_at: string;
  }>(
    `SELECT id, mode, status, est_cost_usd, stats, started_at
       FROM crawl_runs ORDER BY id DESC LIMIT 5`,
  );
  const pipelineMin = byTier.reduce((s, r) => s + Number(r.mn), 0);
  const pipelineMax = byTier.reduce((s, r) => s + Number(r.mx), 0);
  return {
    totalLeads: Number(tot?.n ?? 0),
    newToday: Number(today?.n ?? 0),
    suppressed: Number(sup?.n ?? 0),
    byTier: byTier.map((r) => ({
      tier: r.tier, n: Number(r.n),
      pipelineMin: Number(r.mn), pipelineMax: Number(r.mx),
    })),
    byStatus: byStatus.map((r) => ({ status: r.status, n: Number(r.n) })),
    followupsDue,
    recentRuns,
    pipelineMin,
    pipelineMax,
  };
}

export async function contactHistory(leadId: number) {
  return q<{
    id: number; channel: string; direction: string;
    note: string | null; new_status: string | null; created_at: string;
  }>(
    `SELECT id, channel, direction, note, new_status, created_at
       FROM contact_history WHERE lead_id=$1 ORDER BY created_at DESC`,
    [leadId],
  );
}
