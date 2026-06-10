import { Card } from "@/components/ui";
import { CATEGORIES } from "@/lib/engine/config";
import { CATEGORY_QUERIES } from "@/lib/engine/sources/osmPlaces";
import { AREAS, AREA_GROUPS } from "@/lib/areas";
import TargetedSearch from "@/components/TargetedSearch";

export const dynamic = "force-dynamic";

// "Find leads" — choose the lead types + the area, pull real matching
// businesses from OpenStreetMap on demand.
export default function FindPage() {
  // Only offer categories we can actually query on OSM.
  const queryable = new Set(CATEGORY_QUERIES.map((c) => c.key));
  const categories = CATEGORIES.filter((c) => queryable.has(c.key)).map((c) => ({
    key: c.key,
    label: c.label,
  }));
  const areas = AREAS.map((a) => ({ key: a.key, label: a.label, group: a.group }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Find leads</h1>
        <p className="text-sm text-slate-500">
          Pull real businesses of the types you want, in the area you want —
          free, from OpenStreetMap.
        </p>
      </div>
      <Card>
        <TargetedSearch categories={categories} areas={areas} groups={AREA_GROUPS} />
      </Card>
    </div>
  );
}
