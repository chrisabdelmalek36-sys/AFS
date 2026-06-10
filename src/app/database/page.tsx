import { listLeads } from "@/lib/leads";
import { egp } from "@/components/ui";
import LeadsBoard, { type BoardLead } from "@/components/LeadsBoard";

export const dynamic = "force-dynamic";

// Notion-style lead database — same columns as the AFS Notion workspace,
// every cell editable inline, changes saved straight to the database.
export default async function DatabasePage() {
  const leads = await listLeads();

  const rows: BoardLead[] = leads.map((l) => ({
    id: l.id,
    company: l.name,
    contact_person: l.contact_person,
    contact_title: l.contact_title,
    email: l.email,
    email_status: l.email_status,
    linkedin_url: l.linkedin_url,
    location: [l.city, l.region].filter(Boolean).join(" · ") || null,
    deal:
      l.est_deal_min_egp || l.est_deal_max_egp
        ? `${egp(l.est_deal_min_egp)} – ${egp(l.est_deal_max_egp)}`
        : "—",
    priority: l.priority,
    status: l.status,
    category: l.category,
    notes: l.notes,
    suppressed: l.suppressed,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Lead Database</h1>
        <p className="text-sm text-slate-500">
          Your full lead book — like Notion, but live. Click any cell to edit;
          changes save instantly.
        </p>
      </div>
      <LeadsBoard leads={rows} />
    </div>
  );
}
