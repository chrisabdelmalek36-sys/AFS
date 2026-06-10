import { query } from "../db";
import { log } from "./util/logger";
import { dedupHash, normalizeName, normalizePhone } from "./util/dedup";
import { classify } from "./util/tiering";
import { freshnessScore } from "./util/freshness";
import { findWebsiteEmail } from "./enrich/website";
import { isRelevantBusiness } from "./util/relevance";
import type { RawLead } from "./sources/types";

// Shared merge + tier + store stage, used by the full pipeline (scripts/CLI)
// and the chunked zone scanner (serverless). Keeping one copy means dedupe,
// suppression and tiering behave identically no matter who discovered a lead.

interface Merged extends RawLead {
  hash: string;
  provenance: {
    source: string;
    sourceUrl?: string;
    publishedAt?: string;
    raw?: Record<string, unknown>;
  }[];
}

export function mergeBatch(raw: RawLead[]): Merged[] {
  const byHash = new Map<string, Merged>();
  for (const r of raw) {
    const hash = dedupHash(r);
    const ex = byHash.get(hash);
    if (!ex) {
      byHash.set(hash, {
        ...r,
        hash,
        provenance: [
          { source: r.source, sourceUrl: r.sourceUrl, publishedAt: r.publishedAt, raw: r.raw },
        ],
      });
      continue;
    }
    // Same business from another source: keep richest data, union signals.
    ex.name = ex.name?.length >= (r.name?.length ?? 0) ? ex.name : r.name;
    ex.category ??= r.category;
    ex.subCategory ??= r.subCategory;
    ex.address ??= r.address;
    ex.city ??= r.city;
    ex.region ??= r.region;
    ex.lat ??= r.lat;
    ex.lng ??= r.lng;
    ex.phone ??= r.phone;
    ex.website ??= r.website;
    ex.email ??= r.email;
    ex.googlePlaceId ??= r.googlePlaceId;
    ex.rating = Math.max(ex.rating ?? 0, r.rating ?? 0) || undefined;
    ex.userRatings = Math.max(ex.userRatings ?? 0, r.userRatings ?? 0) || undefined;
    ex.priceLevel = Math.max(ex.priceLevel ?? 0, r.priceLevel ?? 0) || undefined;
    ex.newsHot = ex.newsHot || r.newsHot;
    ex.publishedAt = ex.publishedAt ?? r.publishedAt;
    ex.provenance.push({ source: r.source, sourceUrl: r.sourceUrl, publishedAt: r.publishedAt, raw: r.raw });
  }
  return [...byHash.values()];
}

async function isDoNotContact(
  phoneNorm: string,
  email: string | undefined,
  nameNorm: string,
): Promise<string | null> {
  const r = await query<{ reason: string | null }>(
    `SELECT reason FROM do_not_contact
      WHERE (phone_norm <> '' AND phone_norm = $1)
         OR (email IS NOT NULL AND lower(email) = lower($2))
         OR (name_norm <> '' AND name_norm = $3)
      LIMIT 1`,
    [phoneNorm, email ?? "", nameNorm],
  );
  return r.rowCount ? (r.rows[0]?.reason ?? "on do-not-contact list") : null;
}

export interface IngestStats {
  rawCount: number;
  mergedCount: number;
  inserted: number;
  updated: number;
  suppressed: number;
}

export async function ingestRawLeads(
  raw: RawLead[],
  opts: { enrich: boolean },
): Promise<IngestStats> {
  let merged = mergeBatch(raw).filter((m) =>
    isRelevantBusiness(m.name, m.category),
  );
  // Never resurrect a lead the user explicitly deleted.
  if (merged.length > 0) {
    const del = await query<{ dedup_hash: string }>(
      `SELECT dedup_hash FROM deleted_leads WHERE dedup_hash = ANY($1)`,
      [merged.map((m) => m.hash)],
    );
    if (del.rowCount) {
      const blocked = new Set(del.rows.map((r) => r.dedup_hash));
      merged = merged.filter((m) => !blocked.has(m.hash));
    }
  }
  log.info(`After dedupe + relevance: ${merged.length} unique leads`);

  let inserted = 0,
    updated = 0,
    suppressed = 0;

  for (const m of merged) {
    const phoneNorm = normalizePhone(m.phone);
    const nameNorm = normalizeName(m.name);

    const existing = await query<{
      id: number;
      website: string | null;
      email: string | null;
    }>(
      `SELECT id, website, email FROM leads
        WHERE dedup_hash=$1
           OR (google_place_id IS NOT NULL AND google_place_id=$2)
        LIMIT 1`,
      [m.hash, m.googlePlaceId ?? null],
    );
    const isNew = existing.rowCount === 0;

    // Enrichment: own website only, robots-respecting, opt-in (slow HTTP).
    let email = m.email ?? existing.rows[0]?.email ?? undefined;
    if (!email && opts.enrich) {
      email = await findWebsiteEmail(m.website);
    }

    const dnc = await isDoNotContact(phoneNorm, email, nameNorm);

    const t = classify({
      name: m.name,
      category: m.category,
      rating: m.rating,
      userRatings: m.userRatings,
      priceLevel: m.priceLevel,
      newsHot: m.newsHot,
    });

    const fresh = freshnessScore({
      source: m.provenance[0]?.source ?? m.source,
      publishedAt: m.publishedAt,
      newsHot: m.newsHot,
      isNew,
    });

    let leadId: number;
    if (isNew) {
      const ins = await query<{ id: number }>(
        `INSERT INTO leads
          (dedup_hash, google_place_id, name, name_norm, category, sub_category,
           address, city, region, lat, lng, phone, phone_norm, website, email,
           tier, tier_reason, est_deal_min_egp, est_deal_max_egp, freshness,
           source_primary, source_url, suppressed, suppressed_reason, raw)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
         RETURNING id`,
        [
          m.hash, m.googlePlaceId ?? null, m.name, nameNorm, m.category ?? null,
          m.subCategory ?? null, m.address ?? null, m.city ?? null, m.region ?? null,
          m.lat ?? null, m.lng ?? null, m.phone ?? null, phoneNorm || null,
          m.website ?? null, email ?? null, t.tier, t.reason,
          t.dealMinEgp || null, t.dealMaxEgp || null, fresh,
          m.provenance[0]?.source ?? m.source, m.provenance[0]?.sourceUrl ?? null,
          dnc != null, dnc, JSON.stringify(m.raw ?? {}),
        ],
      );
      leadId = ins.rows[0]!.id;
      inserted++;
    } else {
      leadId = existing.rows[0]!.id;
      await query(
        `UPDATE leads SET
            last_seen = now(),
            freshness = GREATEST(freshness, $2),
            website   = COALESCE(website, $3),
            email     = COALESCE(email, $4),
            phone     = COALESCE(phone, $5),
            phone_norm= COALESCE(NULLIF(phone_norm,''), $6),
            tier      = $7,
            tier_reason = $8,
            est_deal_min_egp = $11,
            est_deal_max_egp = $12,
            suppressed = suppressed OR $9,
            suppressed_reason = COALESCE(suppressed_reason, $10)
          WHERE id=$1`,
        [leadId, fresh, m.website ?? null, email ?? null, m.phone ?? null,
         phoneNorm || null, t.tier, t.reason, dnc != null, dnc,
         t.dealMinEgp || null, t.dealMaxEgp || null],
      );
      updated++;
    }
    if (dnc != null) suppressed++;

    for (const p of m.provenance) {
      await query(
        `INSERT INTO lead_sources (lead_id, source, source_url, detail)
         VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [leadId, p.source, p.sourceUrl ?? null, JSON.stringify(p.raw ?? {})],
      );
    }
  }

  return {
    rawCount: raw.length,
    mergedCount: merged.length,
    inserted,
    updated,
    suppressed,
  };
}
