import { Card } from "@/components/ui";
import { CATEGORIES, config } from "@/lib/engine/config";
import { CATEGORY_QUERIES } from "@/lib/engine/sources/osmPlaces";
import { AREAS, AREA_GROUPS } from "@/lib/areas";
import TargetedSearch from "@/components/TargetedSearch";

export const dynamic = "force-dynamic";

// "Find leads" — choose the lead types + the area, pull real matching
// businesses on demand (Google Places when configured, else OpenStreetMap).
export default function FindPage() {
  // Only offer categories we can actually query.
  const queryable = new Set(CATEGORY_QUERIES.map((c) => c.key));
  const categories = CATEGORIES.filter((c) => queryable.has(c.key)).map((c) => ({
    key: c.key,
    label: c.label,
  }));
  const areas = AREAS.map((a) => ({ key: a.key, label: a.label, group: a.group }));
  const premiumSource = !!config.google.apiKey;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Find leads</h1>
        <p className="text-sm text-slate-500">
          Pull real businesses of the types you want, in the area you want.
        </p>
      </div>

      <div
        className={`rounded-xl border px-4 py-2.5 text-sm ${
          premiumSource
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        {premiumSource ? (
          <>
            <b>Premium source connected.</b> Searches use <b>Google Places</b> —
            real businesses with ratings & reviews, so top venues rank
            Platinum/Gold automatically.
          </>
        ) : (
          <>
            <b>Using free OpenStreetMap data.</b> For premium, rated leads (real
            ratings &amp; reviews → far less noise), add a{" "}
            <code>GOOGLE_MAPS_API_KEY</code> in your Vercel project settings —
            the search switches to Google Places automatically.
          </>
        )}
      </div>

      <Card>
        <TargetedSearch categories={categories} areas={areas} groups={AREA_GROUPS} />
      </Card>
    </div>
  );
}
