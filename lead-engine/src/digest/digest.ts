import { config } from "../config.js";
import { query } from "../db/client.js";
import { log } from "../lib/logger.js";

interface LeadLite {
  id: number;
  name: string;
  tier: string | null;
  category: string | null;
  region: string | null;
  status: string;
  last_contacted_at: string | null;
}

const fmtList = (rows: LeadLite[]) =>
  rows.length
    ? rows
        .map(
          (r) =>
            `  • [${r.tier ?? "—"}] ${r.name} (${r.category ?? "—"}, ${
              r.region ?? "—"
            })${r.status !== "New" ? ` — ${r.status}` : ""}`,
        )
        .join("\n")
    : "  (none)";

export interface DigestData {
  forDate: string;
  newToday: LeadLite[];
  followUps: LeadLite[];
  plannedVisits: LeadLite[];
  hotNews: LeadLite[];
}

export async function buildDigestData(): Promise<DigestData> {
  const forDate = (
    await query<{ d: string }>(
      `SELECT to_char((now() AT TIME ZONE 'Africa/Cairo')::date,
              'YYYY-MM-DD') AS d`,
    )
  ).rows[0]!.d;

  const newToday = (
    await query<LeadLite>(
      `SELECT id,name,tier,category,region,status,last_contacted_at
         FROM leads
        WHERE discovered_date = (now() AT TIME ZONE 'Africa/Cairo')::date
          AND NOT suppressed
        ORDER BY CASE tier WHEN 'Platinum' THEN 0 WHEN 'Gold' THEN 1
                           WHEN 'Silver' THEN 2 ELSE 3 END
        LIMIT 100`,
    )
  ).rows;

  const followUps = (
    await query<LeadLite>(
      `SELECT id,name,tier,category,region,status,last_contacted_at
         FROM leads
        WHERE NOT suppressed
          AND status IN ('Contacted','Replied','Meeting','Quote Sent','Postponed')
          AND (
            (follow_up_at IS NOT NULL AND follow_up_at <= now())
            OR (follow_up_at IS NULL AND last_contacted_at IS NULL)
            OR (follow_up_at IS NULL AND last_contacted_at < now() - interval '7 days')
          )
        ORDER BY last_contacted_at NULLS FIRST
        LIMIT 100`,
    )
  ).rows;

  const plannedVisits = (
    await query<LeadLite>(
      `SELECT id,name,tier,category,region,status,last_contacted_at
         FROM leads
        WHERE NOT suppressed AND status = 'Meeting'
        ORDER BY follow_up_at NULLS LAST LIMIT 100`,
    )
  ).rows;

  const hotNews = (
    await query<LeadLite>(
      `SELECT id,name,tier,category,region,status,last_contacted_at
         FROM leads
        WHERE NOT suppressed
          AND source_primary IN ('newsapi','gdelt','gov_tender')
          AND freshness >= 85
          AND discovered_date >= (now() AT TIME ZONE 'Africa/Cairo')::date
              - interval '7 days'
        ORDER BY freshness DESC LIMIT 50`,
    )
  ).rows;

  return { forDate, newToday, followUps, plannedVisits, hotNews };
}

export function renderDigest(d: DigestData): { subject: string; body: string } {
  const subject =
    `AFS daily digest — ${d.forDate} · ${d.newToday.length} new, ` +
    `${d.followUps.length} follow-ups due`;
  const body = [
    `AFS LEAD ENGINE — DAILY DIGEST`,
    `${d.forDate} (Africa/Cairo)`,
    ``,
    `NEW LEADS TODAY (${d.newToday.length})`,
    fmtList(d.newToday),
    ``,
    `FOLLOW-UPS DUE (${d.followUps.length})`,
    fmtList(d.followUps),
    ``,
    `PLANNED VISITS / MEETINGS (${d.plannedVisits.length})`,
    fmtList(d.plannedVisits),
    ``,
    `HOT NEWS MATCHES (${d.hotNews.length})`,
    fmtList(d.hotNews),
    ``,
    `—`,
    `Open the dashboard to act on these. This digest is generated daily`,
    `at 07:00 Africa/Cairo.`,
  ].join("\n");
  return { subject, body };
}

async function sendEmail(
  to: string,
  subject: string,
  text: string,
): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.outreach.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.outreach.fromEmail,
        to,
        subject,
        text,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function runDigest(): Promise<{
  forDate: string;
  status: string;
  to: string;
}> {
  const data = await buildDigestData();
  const { subject, body } = renderDigest(data);
  const summary = {
    newToday: data.newToday.length,
    followUps: data.followUps.length,
    plannedVisits: data.plannedVisits.length,
    hotNews: data.hotNews.length,
  };

  const owner = config.digest.ownerEmail;
  const canSend =
    config.outreach.liveSend && !!config.outreach.resendApiKey && !!owner;

  let status: "sent" | "simulated" | "failed" = "simulated";
  let provider = "simulated";
  if (canSend) {
    const ok = await sendEmail(owner, subject, body);
    status = ok ? "sent" : "failed";
    provider = ok ? "resend" : "simulated";
  }

  await query(
    `INSERT INTO digests (for_date, sent_to, provider, status, summary, body)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [data.forDate, owner || null, provider, status, JSON.stringify(summary), body],
  );

  log.info(
    `Digest ${data.forDate}: ${JSON.stringify(summary)} → ${status}` +
      (owner ? ` (${owner})` : " (no AFS_OWNER_EMAIL set)"),
  );
  return { forDate: data.forDate, status, to: owner || "(unset)" };
}
