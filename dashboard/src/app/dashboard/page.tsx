import Link from "next/link";
import { dashboardSummary } from "@/lib/leads";
import { Card, TierBadge, StatusBadge, egp } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const s = await dashboardSummary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Today&apos;s discovery, pipeline value and follow-ups due.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card title="New leads today">
          <p className="text-3xl font-bold text-violet-600">{s.newToday}</p>
        </Card>
        <Card title="Total leads">
          <p className="text-3xl font-bold">{s.totalLeads}</p>
        </Card>
        <Card title="Pipeline value (est.)">
          <p className="text-xl font-bold">
            {egp(s.pipelineMin)} – {egp(s.pipelineMax)}
          </p>
        </Card>
        <Card title="Suppressed (do-not-contact)">
          <p className="text-3xl font-bold text-rose-600">{s.suppressed}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="By tier">
          <table className="w-full text-sm">
            <tbody>
              {s.byTier.map((t) => (
                <tr key={t.tier} className="border-b border-slate-100 last:border-0">
                  <td className="py-2">
                    <TierBadge tier={t.tier} />
                  </td>
                  <td className="py-2 font-semibold">{t.n}</td>
                  <td className="py-2 text-right text-slate-500">
                    {egp(t.pipelineMin)} – {egp(t.pipelineMax)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Pipeline by status">
          <div className="flex flex-wrap gap-2">
            {s.byStatus.map((x) => (
              <div
                key={x.status}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
              >
                <StatusBadge status={x.status} />
                <span className="font-semibold">{x.n}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title={`Follow-ups due (${s.followupsDue.length})`}>
        {s.followupsDue.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nothing overdue. Leads move here once contacted and 7+ days pass with no reply.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {s.followupsDue.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2">
                <Link
                  href={`/lead/${l.id}`}
                  className="font-medium text-violet-700 hover:underline"
                >
                  {l.name}
                </Link>
                <span className="flex items-center gap-3 text-xs text-slate-500">
                  <TierBadge tier={l.tier} />
                  <StatusBadge status={l.status} />
                  {l.last_contacted_at
                    ? `last ${new Date(l.last_contacted_at).toLocaleDateString()}`
                    : "never contacted"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Recent discovery runs">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-400">
            <tr>
              <th className="py-1">Run</th>
              <th>Mode</th>
              <th>Status</th>
              <th>Cost</th>
              <th>Result</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {s.recentRuns.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="py-1.5">#{r.id}</td>
                <td>{r.mode}</td>
                <td>{r.status}</td>
                <td>${r.est_cost_usd}</td>
                <td className="text-slate-500">
                  {JSON.stringify(r.stats)}
                </td>
                <td className="text-slate-500">
                  {new Date(r.started_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
