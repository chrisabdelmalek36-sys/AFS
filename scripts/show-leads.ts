import { query, closeDb } from "../src/lib/db";

// Proof tool: prints what is actually in the database.
async function main() {
  const counts = await query<{ tier: string; n: string }>(
    `SELECT COALESCE(tier,'(none)') tier, COUNT(*) n
       FROM leads GROUP BY tier ORDER BY n DESC`,
  );
  const total = await query<{ n: string }>(`SELECT COUNT(*) n FROM leads`);
  const sup = await query<{ n: string }>(
    `SELECT COUNT(*) n FROM leads WHERE suppressed`,
  );
  const runs = await query<{
    id: number; mode: string; status: string; stats: unknown; est_cost_usd: string;
  }>(
    `SELECT id, mode, status, stats, est_cost_usd
       FROM crawl_runs ORDER BY id DESC LIMIT 3`,
  );

  console.log("\n================ LEADS IN DATABASE ================");
  console.log(`Total leads: ${total.rows[0]?.n}   Suppressed (DNC): ${sup.rows[0]?.n}\n`);
  console.log("By tier:");
  for (const r of counts.rows) console.log(`  ${r.tier.padEnd(10)} ${r.n}`);

  const rows = await query<{
    name: string; tier: string; category: string | null; region: string | null;
    phone: string | null; email: string | null; freshness: number;
    est_deal_min_egp: string | null; est_deal_max_egp: string | null;
    suppressed: boolean; source_primary: string | null;
  }>(
    `SELECT name, tier, category, region, phone, email, freshness,
            est_deal_min_egp, est_deal_max_egp, suppressed, source_primary
       FROM leads
      ORDER BY suppressed ASC,
               CASE tier WHEN 'Platinum' THEN 0 WHEN 'Gold' THEN 1
                         WHEN 'Silver' THEN 2 ELSE 3 END,
               freshness DESC
      LIMIT 60`,
  );
  console.log("\nLeads:");
  for (const r of rows.rows) {
    const deal =
      r.est_deal_min_egp && r.est_deal_max_egp
        ? `${(+r.est_deal_min_egp / 1000).toFixed(0)}K-${(+r.est_deal_max_egp / 1e6).toFixed(1)}M`
        : "-";
    const flag = r.suppressed ? " [SUPPRESSED]" : "";
    console.log(
      `  [${(r.tier ?? "-").padEnd(8)}] ${r.name.slice(0, 38).padEnd(38)} ` +
        `${(r.category ?? "-").padEnd(13)} ${(r.region ?? "-").padEnd(13)} ` +
        `f=${String(r.freshness).padStart(3)} EGP ${deal.padEnd(10)} ` +
        `src=${r.source_primary ?? "-"}${flag}`,
    );
  }

  console.log("\nRecent runs:");
  for (const r of runs.rows) {
    console.log(
      `  #${r.id} ${r.mode} ${r.status} $${r.est_cost_usd} ${JSON.stringify(r.stats)}`,
    );
  }
  console.log("==================================================\n");
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
