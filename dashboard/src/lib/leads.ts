import { q } from "./db";

// Mirrors the engine's name normalization (do-not-contact matching).
export function normalizeName(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s؀-ۿ]/g, " ")
    .replace(/\b(co|company|corp|llc|ltd|inc|group|egypt|cairo|the|for|and)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
  follow_up_at: string | null;
  source_primary: string | null;
  source_url: string | null;
  suppressed: boolean;
  suppressed_reason: string | null;
}

export const STATUSES = [
  "New", "Contacted", "Replied", "Meeting",
  "Quote Sent", "Postponed", "Closed Won", "Closed Lost",
] as const;

// Leads still needing first action (shown on the map / route planner).
export const ACTIONABLE_STATUS = "New";

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
        AND status IN ('Contacted','Replied','Meeting','Quote Sent','Postponed')
        AND (
          (follow_up_at IS NOT NULL AND follow_up_at <= now())
          OR (follow_up_at IS NULL AND (last_contacted_at IS NULL
              OR last_contacted_at < now() - interval '7 days'))
        )
      ORDER BY follow_up_at NULLS FIRST, last_contacted_at NULLS FIRST
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

export interface OutreachMessage {
  id: number;
  lead_id: number;
  channel: string;
  step_index: number;
  step_label: string | null;
  subject: string | null;
  body: string;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  generated_by: string;
}

export async function messagesForLead(
  leadId: number,
): Promise<OutreachMessage[]> {
  return q<OutreachMessage>(
    `SELECT id, lead_id, channel, step_index, step_label, subject, body,
            status, scheduled_for, sent_at, generated_by
       FROM outreach_messages WHERE lead_id=$1
      ORDER BY channel, step_index`,
    [leadId],
  );
}

export interface OutreachRow {
  id: number;
  name: string;
  tier: string | null;
  category: string | null;
  status: string;
  suppressed: boolean;
  outreach_generated_at: string | null;
  emails_total: number;
  emails_done: number;
  next_send: string | null;
}

export async function outreachQueue(): Promise<OutreachRow[]> {
  return q<OutreachRow>(
    `SELECT l.id, l.name, l.tier, l.category, l.status, l.suppressed,
            l.outreach_generated_at,
            COUNT(m.*) FILTER (WHERE m.channel='email')          AS emails_total,
            COUNT(m.*) FILTER (WHERE m.channel='email'
              AND m.status IN ('sent','simulated'))              AS emails_done,
            MIN(m.scheduled_for) FILTER (WHERE m.channel='email'
              AND m.status='scheduled')                          AS next_send
       FROM leads l
       LEFT JOIN outreach_messages m ON m.lead_id=l.id
      WHERE l.outreach_generated_at IS NOT NULL OR NOT l.suppressed
      GROUP BY l.id
      ORDER BY l.outreach_generated_at DESC NULLS LAST,
               CASE l.tier WHEN 'Platinum' THEN 0 WHEN 'Gold' THEN 1
                           WHEN 'Silver' THEN 2 ELSE 3 END
      LIMIT 500`,
  );
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
