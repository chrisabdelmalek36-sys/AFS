import { listLeads } from "@/lib/leads";
import { egp } from "@/components/ui";
import KanbanBoard, { type KanbanLead } from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

// Kanban view of the sales pipeline — drag leads between status columns.
export default async function PipelinePage() {
  const leads = await listLeads();

  const cards: KanbanLead[] = leads
    .filter((l) => !l.suppressed)
    .map((l) => ({
      id: l.id,
      name: l.name,
      tier: l.tier,
      category: l.category,
      city: l.city,
      deal:
        l.est_deal_min_egp || l.est_deal_max_egp
          ? `${egp(l.est_deal_min_egp)} – ${egp(l.est_deal_max_egp)}`
          : "—",
      contact_person: l.contact_person,
      status: l.status,
    }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-sm text-slate-500">
          Your whole pipeline as a board — drag a lead to move it forward.
        </p>
      </div>
      <KanbanBoard leads={cards} />
    </div>
  );
}
