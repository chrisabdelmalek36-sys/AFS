import Link from "next/link";
import { todayData, whatsappFollowupsDue, listLeads } from "@/lib/leads";
import { Card, Kpi, Bar, TierBadge, StatusBadge } from "@/components/ui";
import WhatsAppSendButton from "@/components/WhatsAppSendButton";
import { nearestArea, areaByKey } from "@/lib/areas";

export const dynamic = "force-dynamic";

// The morning screen: one page that tells you exactly what to do today —
// which area to visit, who to WhatsApp, what's emailing out, who to chase.
export default async function TodayPage() {
  const [t, waDue, allLeads] = await Promise.all([
    todayData(),
    whatsappFollowupsDue(),
    listLeads(),
  ]);

  // Best areas to visit today = most untouched (New) leads per map area.
  const areaCounts = new Map<string, number>();
  for (const l of allLeads) {
    if (l.suppressed || l.status !== "New" || l.lat == null || l.lng == null) continue;
    const a = nearestArea(Number(l.lat), Number(l.lng));
    if (a) areaCounts.set(a.key, (areaCounts.get(a.key) ?? 0) + 1);
  }
  const bestAreas = [...areaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, n]) => ({ area: areaByKey(key)!, n }));
  const maxArea = Math.max(...bestAreas.map((b) => b.n), 1);

  const dateStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Cairo",
  });

  const todoCount = waDue.length + t.followupsDue.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-sm text-slate-500">
          {dateStr} · {todoCount} action{todoCount === 1 ? "" : "s"} waiting ·{" "}
          {t.newToday.length} new lead{t.newToday.length === 1 ? "" : "s"} found today
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi label="WhatsApp to send" tone="emerald" value={waDue.length} sub="pre-filled, one tap each" />
        <Kpi label="Follow-ups due" tone="amber" value={t.followupsDue.length} sub="gone quiet 7+ days" />
        <Kpi label="Emails going out" tone="sky" value={t.emailsToday.length} sub="automatic (or simulated)" />
        <Kpi label="New leads today" tone="violet" value={t.newToday.length} sub="from the daily scan" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Where to go */}
        <Card
          title="Where to visit today"
          subtitle="Areas with the most untouched leads"
          right={
            <Link href="/map" className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700">
              Open map
            </Link>
          }
        >
          {bestAreas.length === 0 ? (
            <p className="text-sm text-slate-500">
              No untouched leads with locations yet. Run{" "}
              <Link href="/dashboard" className="text-violet-700 underline">Find real leads</Link>.
            </p>
          ) : (
            <div className="space-y-1">
              {bestAreas.map(({ area, n }) => (
                <Bar
                  key={area.key}
                  label={
                    <Link href={`/map?area=${area.key}`} className="text-violet-700 hover:underline">
                      {area.label}
                    </Link>
                  }
                  value={n}
                  max={maxArea}
                  color="#7c3aed"
                  right={`${n} to approach`}
                />
              ))}
              <p className="pt-1 text-xs text-slate-400">
                Tap an area to open it on the map and plan the route.
              </p>
            </div>
          )}
        </Card>

        {/* New hot leads */}
        <Card title="New leads found today" subtitle="Best first — say hello while they're fresh">
          {t.newToday.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nothing new yet today. The daily scan runs early morning; you can
              also run it from the Dashboard.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {t.newToday.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/lead/${l.id}`} className="font-medium text-violet-700 hover:underline">
                    {l.name}
                  </Link>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    <TierBadge tier={l.tier} />
                    {l.category ?? ""} {l.city ? `· ${l.city}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* WhatsApp actions */}
      <Card title={`WhatsApp to send (${waDue.length})`} subtitle="Message is pre-typed — you press send">
        {waDue.length === 0 ? (
          <p className="text-sm text-slate-500">All caught up. New steps appear as their day arrives.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {waDue.map((w) => (
              <li key={w.message_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <Link href={`/lead/${w.lead_id}`} className="font-medium text-violet-700 hover:underline">
                    {w.name}
                  </Link>
                  <span className="ml-2 text-xs text-slate-500">
                    {w.contact_person ? `${w.contact_person} · ` : ""}{w.step_label}
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

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Follow-ups */}
        <Card title={`Follow-ups due (${t.followupsDue.length})`} subtitle="Contacted but quiet — give them a nudge">
          {t.followupsDue.length === 0 ? (
            <p className="text-sm text-slate-500">Nobody overdue. Nice.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {t.followupsDue.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/lead/${l.id}`} className="font-medium text-violet-700 hover:underline">
                    {l.name}
                  </Link>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
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

        {/* Emails out today */}
        <Card title={`Emails going out (${t.emailsToday.length})`} subtitle="The sequence sends these automatically">
          {t.emailsToday.length === 0 ? (
            <p className="text-sm text-slate-500">No scheduled emails due today.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {t.emailsToday.map((e) => (
                <li key={e.message_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <Link href={`/lead/${e.lead_id}`} className="font-medium text-violet-700 hover:underline">
                      {e.name}
                    </Link>
                    <p className="line-clamp-1 text-xs text-slate-500">
                      {e.step_label} — {e.subject ?? ""}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(e.scheduled_for).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
