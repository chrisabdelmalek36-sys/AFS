import { listLeads } from "@/lib/leads";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Downloads the lead book as a CSV (opens directly in Excel / Google Sheets).
export async function GET() {
  const leads = await listLeads();
  const header = [
    "id", "company", "contact_person", "contact_title", "email",
    "email_status", "linkedin_url", "contact_verified", "phone", "website",
    "category", "city", "region", "address", "tier", "priority", "status",
    "est_deal_min_egp", "est_deal_max_egp", "notes", "discovered_date",
    "last_contacted_at", "source_url",
  ];
  const lines = [header.join(",")];
  for (const l of leads) {
    lines.push(
      [
        l.id, l.name, l.contact_person, l.contact_title, l.email,
        l.email_status, l.linkedin_url, l.contact_verified, l.phone, l.website,
        l.category, l.city, l.region, l.address, l.tier, l.priority, l.status,
        l.est_deal_min_egp, l.est_deal_max_egp, l.notes, l.discovered_date,
        l.last_contacted_at, l.source_url,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  // BOM so Excel opens Arabic names correctly.
  const body = "﻿" + lines.join("\r\n");
  const today = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="afs-leads-${today}.csv"`,
    },
  });
}
