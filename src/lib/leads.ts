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
  contact_person: string | null;
  contact_title: string | null;
  linkedin_url: string | null;
  contact_verified: boolean;
  priority: string | null;
  notes: string | null;
  email_status: string | null;
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

// Pipeline statuses & priorities live in one pure module (also used by the
// DB constraint and client components); re-exported here for existing imports.
export {
  STATUSES,
  ACTIONABLE_STATUS,
  PRIORITIES,
  EMAIL_STATUSES,
} from "./statuses";
import { STATUSES, PRIORITIES, EMAIL_STATUSES, ACTIVE_STATUSES, IN_PROGRESS_STATUSES } from "./statuses";

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

export interface ContactPatch {
  contact_person?: string | null;
  contact_title?: string | null;
  linkedin_url?: string | null;
  contact_verified?: boolean;
  priority?: string | null;
  notes?: string | null;
  email_status?: string | null;
  email?: string | null;
  status?: string;
}

// Saves the user's inline edits from the Leads database / detail page. Only
// the fields present in the patch are touched, so editing one cell never
// clears the others. Invalid enum values are ignored rather than stored.
export async function updateLeadContact(
  id: number,
  patch: ContactPatch,
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [id];
  const add = (col: string, val: unknown) => {
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  };
  if ("contact_person" in patch) add("contact_person", patch.contact_person || null);
  if ("contact_title" in patch) add("contact_title", patch.contact_title || null);
  if ("linkedin_url" in patch) add("linkedin_url", patch.linkedin_url || null);
  if ("contact_verified" in patch) add("contact_verified", !!patch.contact_verified);
  if ("notes" in patch) add("notes", patch.notes || null);
  if ("email" in patch) add("email", patch.email || null);
  if ("priority" in patch)
    add("priority", patch.priority && PRIORITIES.includes(patch.priority as never) ? patch.priority : null);
  if ("email_status" in patch)
    add("email_status", patch.email_status && EMAIL_STATUSES.includes(patch.email_status as never) ? patch.email_status : null);
  if ("status" in patch && patch.status && STATUSES.includes(patch.status as never))
    add("status", patch.status);
  if (sets.length === 0) return;
  await q(`UPDATE leads SET ${sets.join(", ")} WHERE id=$1`, params);
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
  newThisWeek: number;
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
  valueWonMax: number;
  valueInProgressMax: number;
  wonCount: number;
  lostCount: number;
  workedCount: number;       // leads moved beyond "New"
  topRegions: { region: string; n: number }[];
  topCategories: { category: string; n: number }[];
}

export async function dashboardSummary(): Promise<DashboardSummary> {
  const [tot] = await q<{ n: string }>(`SELECT COUNT(*) n FROM leads`);
  const [today] = await q<{ n: string }>(
    `SELECT COUNT(*) n FROM leads
      WHERE discovered_date = (now() AT TIME ZONE 'Africa/Cairo')::date`,
  );
  const [week] = await q<{ n: string }>(
    `SELECT COUNT(*) n FROM leads
      WHERE discovered_date >= (now() AT TIME ZONE 'Africa/Cairo')::date - 6`,
  );
  const [sup] = await q<{ n: string }>(
    `SELECT COUNT(*) n FROM leads WHERE suppressed`,
  );
  const [val] = await q<{ won: string; prog: string; wonc: string; lostc: string; worked: string }>(
    `SELECT
       COALESCE(SUM(est_deal_max_egp) FILTER (WHERE status='Closed Won'),0) won,
       COALESCE(SUM(est_deal_max_egp) FILTER (WHERE status = ANY($1)),0) prog,
       COUNT(*) FILTER (WHERE status='Closed Won') wonc,
       COUNT(*) FILTER (WHERE status='Closed Lost') lostc,
       COUNT(*) FILTER (WHERE status <> 'New') worked
     FROM leads WHERE NOT suppressed`,
    [IN_PROGRESS_STATUSES],
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
  const topRegions = await q<{ region: string; n: string }>(
    `SELECT region, COUNT(*) n FROM leads
      WHERE NOT suppressed AND region IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC LIMIT 6`,
  );
  const topCategories = await q<{ category: string; n: string }>(
    `SELECT category, COUNT(*) n FROM leads
      WHERE NOT suppressed AND category IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC LIMIT 6`,
  );
  const followupsDue = await q<Lead>(
    `SELECT * FROM leads
      WHERE NOT suppressed
        AND status = ANY($1)
        AND (
          (follow_up_at IS NOT NULL AND follow_up_at <= now())
          OR (follow_up_at IS NULL AND (last_contacted_at IS NULL
              OR last_contacted_at < now() - interval '7 days'))
        )
      ORDER BY follow_up_at NULLS FIRST, last_contacted_at NULLS FIRST
      LIMIT 25`,
    [IN_PROGRESS_STATUSES],
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
    newThisWeek: Number(week?.n ?? 0),
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
    valueWonMax: Number(val?.won ?? 0),
    valueInProgressMax: Number(val?.prog ?? 0),
    wonCount: Number(val?.wonc ?? 0),
    lostCount: Number(val?.lostc ?? 0),
    workedCount: Number(val?.worked ?? 0),
    topRegions: topRegions.map((r) => ({ region: r.region, n: Number(r.n) })),
    topCategories: topCategories.map((r) => ({ category: r.category, n: Number(r.n) })),
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

export interface WhatsAppDue {
  message_id: number;
  lead_id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  phone_norm: string | null;
  tier: string | null;
  step_label: string | null;
  body: string;
  scheduled_for: string;
}

// WhatsApp sequence steps that are due to be sent (manually, via wa.me).
// Only for leads still being worked and never for suppressed ones.
export async function whatsappFollowupsDue(): Promise<WhatsAppDue[]> {
  return q<WhatsAppDue>(
    `SELECT m.id AS message_id, m.lead_id, l.name, l.contact_person,
            l.phone, l.phone_norm, l.tier, m.step_label, m.body, m.scheduled_for
       FROM outreach_messages m
       JOIN leads l ON l.id = m.lead_id
      WHERE m.channel='whatsapp' AND m.status='scheduled'
        AND m.scheduled_for <= now()
        AND NOT l.suppressed
        AND l.status = ANY($1)
      ORDER BY CASE l.tier WHEN 'Platinum' THEN 0 WHEN 'Gold' THEN 1
                           WHEN 'Silver' THEN 2 ELSE 3 END,
               m.scheduled_for
      LIMIT 100`,
    [ACTIVE_STATUSES],
  );
}

// Marks one WhatsApp step as sent (after the user taps the wa.me link),
// logs it, and advances a brand-new lead to Contacted.
export async function markWhatsappSent(messageId: number): Promise<boolean> {
  const r = await q<{ lead_id: number; step_label: string | null }>(
    `UPDATE outreach_messages
        SET status='sent', provider='manual', sent_at=now(), updated_at=now()
      WHERE id=$1 AND channel='whatsapp' AND status <> 'sent'
      RETURNING lead_id, step_label`,
    [messageId],
  );
  const row = r[0];
  if (!row) return false;
  await q(
    `INSERT INTO contact_history (lead_id, channel, direction, note)
     VALUES ($1,'whatsapp','out',$2)`,
    [row.lead_id, `WhatsApp ${row.step_label ?? "message"} sent`],
  );
  await q(
    `UPDATE leads SET last_contacted_at=now(),
        status=CASE WHEN status='New' THEN 'Contacted' ELSE status END
      WHERE id=$1`,
    [row.lead_id],
  );
  return true;
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
