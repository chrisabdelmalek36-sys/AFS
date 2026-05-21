import Link from "next/link";
import { listLeads, distinctValues, STATUSES } from "@/lib/leads";
import { Card, TierBadge, StatusBadge, egp } from "@/components/ui";

export const dynamic = "force-dynamic";

const TIERS = ["Platinum", "Gold", "Silver", "Unrated"];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const filter = {
    tier: searchParams.tier,
    category: searchParams.category,
    city: searchParams.city,
    region: searchParams.region,
    status: searchParams.status,
    q: searchParams.q,
  };
  const [leads, dv] = await Promise.all([listLeads(filter), distinctValues()]);

  const Select = ({
    name,
    options,
    value,
  }: {
    name: string;
    options: string[];
    value?: string;
  }) => (
    <select
      name={name}
      defaultValue={value ?? ""}
      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
    >
      <option value="">{`All ${name}`}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-slate-500">{leads.length} shown</p>
        </div>
      </div>

      <Card>
        <form className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={filter.q ?? ""}
            placeholder="Search name…"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
          <Select name="tier" options={TIERS} value={filter.tier} />
          <Select name="category" options={dv.categories} value={filter.category} />
          <Select name="region" options={dv.regions} value={filter.region} />
          <Select name="city" options={dv.cities} value={filter.city} />
          <Select name="status" options={[...STATUSES]} value={filter.status} />
          <button className="rounded-md bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700">
            Filter
          </button>
          <Link
            href="/leads"
            className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Reset
          </Link>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Tier</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">City / Region</th>
              <th className="px-4 py-2">Deal (est.)</th>
              <th className="px-4 py-2">Fresh</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr
                key={l.id}
                className={`border-t border-slate-100 hover:bg-slate-50 ${
                  l.suppressed ? "opacity-50" : ""
                }`}
              >
                <td className="px-4 py-2">
                  <Link
                    href={`/lead/${l.id}`}
                    className="font-medium text-violet-700 hover:underline"
                  >
                    {l.name}
                  </Link>
                  {l.suppressed && (
                    <span className="ml-2 text-xs font-semibold text-rose-600">
                      DO NOT CONTACT
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <TierBadge tier={l.tier} />
                </td>
                <td className="px-4 py-2 text-slate-600">{l.category ?? "—"}</td>
                <td className="px-4 py-2 text-slate-600">
                  {[l.city, l.region].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {egp(l.est_deal_min_egp)} – {egp(l.est_deal_max_egp)}
                </td>
                <td className="px-4 py-2 text-slate-600">{l.freshness}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={l.status} />
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No leads match. Run the engine: <code>cd lead-engine &amp;&amp; npm run dev</code>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
