import Link from "next/link";
import { listLeads, ACTIONABLE_STATUS } from "@/lib/leads";
import MapShell from "@/components/MapShell";
import type { MapLead } from "@/components/LeafletMap";

export const dynamic = "force-dynamic";

export default async function MapPage({
  searchParams,
}: {
  searchParams: { all?: string; area?: string; areas?: string; ids?: string };
}) {
  // When showing a specific search result (?ids=), include leads of any
  // status so every match is on the map, not just the brand-new ones.
  const idsMode = !!searchParams.ids;
  const showAll = searchParams.all === "1" || idsMode;
  const all = await listLeads();

  const onMap = all.filter(
    (l) =>
      l.lat != null &&
      l.lng != null &&
      !l.suppressed &&
      (showAll || l.status === ACTIONABLE_STATUS),
  );
  const hidden = all.filter(
    (l) =>
      l.lat != null &&
      l.lng != null &&
      !l.suppressed &&
      l.status !== ACTIONABLE_STATUS,
  ).length;

  const leads: MapLead[] = onMap.map((l) => ({
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
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Map</h1>
          <p className="text-sm text-slate-500">
            {leads.length} lead(s) to approach · pins colored by tier ·
            contacted leads drop off automatically
          </p>
        </div>
        <div className="text-sm">
          {showAll ? (
            <Link
              href="/map"
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
            >
              Show only leads to approach
            </Link>
          ) : (
            <Link
              href="/map?all=1"
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
            >
              Show all ({hidden} contacted/actioned hidden)
            </Link>
          )}
        </div>
      </div>
      <MapShell
        leads={leads}
        initialAreaKey={searchParams.area ?? ""}
        initialAreaKeys={searchParams.areas ?? ""}
        initialIds={searchParams.ids ?? ""}
      />
    </div>
  );
}
