import { listLeads, distinctValues } from "@/lib/leads";
import MapShell from "@/components/MapShell";
import type { MapLead } from "@/components/LeafletMap";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [all, dv] = await Promise.all([listLeads(), distinctValues()]);
  const leads: MapLead[] = all
    .filter((l) => l.lat != null && l.lng != null && !l.suppressed)
    .map((l) => ({
      id: l.id,
      name: l.name,
      lat: Number(l.lat),
      lng: Number(l.lng),
      tier: l.tier,
      status: l.status,
      category: l.category,
    }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Map</h1>
        <p className="text-sm text-slate-500">
          {leads.length} leads with coordinates · pins colored by tier · plan a
          door-to-door route
        </p>
      </div>
      <MapShell leads={leads} regions={dv.regions} />
    </div>
  );
}
