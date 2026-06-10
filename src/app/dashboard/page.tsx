import Link from "next/link";
import { dashboardSummary, whatsappFollowupsDue } from "@/lib/leads";
import { Card, Kpi, Bar, TierBadge, StatusBadge, egp } from "@/components/ui";
import ScanButton from "@/components/ScanButton";
import WhatsAppSendButton from "@/components/WhatsAppSendButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const s = await dashboardSummary();
  const waDue = await whatsappFollowupsDue();

  const statusN = (k: string) => s.byStatus.find((x) => x.status === k)?.n ?? 0;
  const active = s.totalLeads - s.suppressed;
  // Simple acquisition funnel from status counts.
  const reachedOut = s.workedCount;
  const meetingPlus =
    statusN("Meeting") + statusN("Quote Sent") + statusN("Negotiation") + s.wonCount;
  const funnel = [
    { label: "Leads", value: active, color: "#0ea5e9" },
    { label: "Worked (contacted+)", value: reachedOut, color: "#6366f1" },
    { label: "Meeting / Quote / Negotiation", value: meetingPlus, color: "#f59e0b" },
    { label: "Closed Won", value: s.wonCount, color: "#16a34a" },
  ];
  const funnelMax = Math.max(active, 1);
  const winRate = reachedOut > 0 ? Math.round((s.wonCount / reachedOut) * 100) : 0;
  const maxRegion = Math.max(...s.topRegions.map((r) => r.n), 1);
  const maxCat = Math.max(...s.topCategories.map((c) => c.n), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Your pipeline at a glance — discovery, value and what to do next.
          </p>
        </div>
        <ScanButton />
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi label="Total leads" value={s.totalLeads} sub={`${s.newThisWeek} new this week · ${s.newToday} today`} />
        <Kpi label="Pipeline value (est.)" tone="violet" value={egp(s.pipelineMax)} sub={`from ${egp(s.pipelineMin)} min`} />
        <Kpi label="Won value" tone="emerald" value={egp(s.valueWonMax)} sub={`${s.wonCount} deal${s.wonCount === 1 ? "" : "s"} · ${winRate}% win rate`} />
        <Kpi label="In progress" tone="amber" value={egp(s.valueInProgressMax)} sub={`${s.workedCount} leads being worked`} />
      </div>

      {/* Funnel + status */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Acquisition funnel" subtitle="From discovered to won">
          <div className="space-y-1.5">
            {funnel.map((f) => (
              <Bar key={f.label} label={f.label} value={f.value} max={funnelMax} color={f.color} />
            ))}
          </div>
        </Card>

        <Card title="Pipeline by status">
          {s.byStatus.length === 0 ? (
            <p className="text-sm text-slate-400">No leads yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {s.byStatus.map((x) => (
                <div
                  key={x.status}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
                >
                  <StatusBadge status={x.status} />
                  <span className="font-semibold tnum">{x.n}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Tier value + top areas + top categories */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Value by tier">
          <table className="w-full text-sm">
            <tbody>
              {s.byTier.map((t) => (
                <tr key={t.tier} className="border-b border-slate-100 last:border-0">
                  <td className="py-2"><TierBadge tier={t.tier} /></td>
                  <td className="py-2 font-semibold tnum">{t.n}</td>
                  <td className="py-2 text-right text-slate-500 tnum">
                    {egp(t.pipelineMin)} – {egp(t.pipelineMax)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Top areas">
          {s.topRegions.length === 0 ? (
            <p className="text-sm text-slate-400">No leads yet.</p>
          ) : (
            <div className="space-y-1">
              {s.topRegions.map((r) => (
                <Bar key={r.region} label={r.region} value={r.n} max={maxRegion} color="#0ea5e9" />
              ))}
            </div>
          )}
        </Card>

        <Card title="Top categories">
          {s.topCategories.length === 0 ? (
            <p className="text-sm text-slate-400">No leads yet.</p>
          ) : (
            <div className="space-y-1">
              {s.topCategories.map((c) => (
                <Bar key={c.category} label={c.category} value={c.n} max={maxCat} color="#7c3aed" />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Action lists */}
      <Card title={`Follow-ups due (${s.followupsDue.length})`} subtitle="Contacted leads gone quiet 7+ days">
        {s.followupsDue.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nothing overdue. Leads move here once contacted and 7+ days pass with no reply.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {s.followupsDue.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/lead/${l.id}`} className="font-medium text-violet-700 hover:underline">
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

      <Card title={`WhatsApp follow-ups due (${waDue.length})`} subtitle="Tap to message — pre-filled, you press send">
        {waDue.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nothing due. Generate outreach on a lead to start a WhatsApp
            sequence — due steps show up here each day.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {waDue.map((w) => (
              <li key={w.message_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <Link href={`/lead/${w.lead_id}`} className="font-medium text-violet-700 hover:underline">
                    {w.name}
                  </Link>
                  <span className="ml-2 text-xs text-slate-500">
                    {w.contact_person ? `${w.contact_person} · ` : ""}
                    {w.step_label}
                  </span>
                  <p className="mt-0.5 line-clamp-1 max-w-xl text-xs text-slate-500">{w.body}</p>
                </div>
                <WhatsAppSendButton
                  messageId={w.message_id}
                  phone={w.phone}
                  phoneNorm={w.phone_norm}
                  text={w.body}
                  sent={false}
                  label="Send on WhatsApp"
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Recent discovery runs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-400">
              <tr>
                <th className="py-1 pr-3">Run</th>
                <th className="pr-3">Mode</th>
                <th className="pr-3">Status</th>
                <th className="pr-3">Result</th>
                <th className="pr-3">When</th>
              </tr>
            </thead>
            <tbody>
              {s.recentRuns.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="py-1.5 pr-3">#{r.id}</td>
                  <td className="pr-3">{r.mode}</td>
                  <td className="pr-3">{r.status}</td>
                  <td className="max-w-[18rem] truncate pr-3 text-slate-500">{JSON.stringify(r.stats)}</td>
                  <td className="whitespace-nowrap pr-3 text-slate-500">
                    {new Date(r.started_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {s.recentRuns.length === 0 && (
                <tr><td colSpan={5} className="py-3 text-slate-400">No runs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
