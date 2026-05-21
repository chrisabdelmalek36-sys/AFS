import Link from "next/link";
import { outreachQueue } from "@/lib/leads";
import { Card, TierBadge, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const rows = await outreachQueue();
  const withOutreach = rows.filter((r) => r.outreach_generated_at);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Outreach</h1>
        <p className="text-sm text-slate-500">
          {withOutreach.length} lead(s) have drafts · open a lead to generate
          or review messages
        </p>
      </div>

      <Card className="bg-slate-50 text-sm text-slate-600">
        <p className="font-semibold text-slate-700">How sending works</p>
        <ul className="ml-4 mt-1 list-disc space-y-0.5">
          <li>
            <b>Email</b> — a 5-step sequence (Day 0 / 3 / 8 / 15 / 30). The
            worker sends each step when due. Without a Resend key (or with
            live-send off) every send is <b>simulated</b> — nothing actually
            leaves. Every email carries an unsubscribe link + address.
          </li>
          <li>
            <b>WhatsApp</b> — Mode 1: opens WhatsApp with the message
            pre-typed. You press send.
          </li>
          <li>
            <b>LinkedIn</b> — draft only (you paste it manually — protects
            your account).
          </li>
          <li>
            <b>Visit</b> — a 1-page brief for door-to-door visits.
          </li>
          <li>
            The sequence stops automatically if the lead replies, moves
            forward, or unsubscribes. Suppressed leads are never contacted.
          </li>
        </ul>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Lead</th>
              <th className="px-4 py-2">Tier</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Outreach</th>
              <th className="px-4 py-2">Email progress</th>
              <th className="px-4 py-2">Next email</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={`border-t border-slate-100 hover:bg-slate-50 ${
                  r.suppressed ? "opacity-50" : ""
                }`}
              >
                <td className="px-4 py-2">
                  <Link
                    href={`/lead/${r.id}`}
                    className="font-medium text-violet-700 hover:underline"
                  >
                    {r.name}
                  </Link>
                  {r.suppressed && (
                    <span className="ml-2 text-xs font-semibold text-rose-600">
                      DO NOT CONTACT
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <TierBadge tier={r.tier} />
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {r.outreach_generated_at ? (
                    <span className="text-emerald-700">Drafted</span>
                  ) : (
                    <span className="text-slate-400">Not yet</span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {Number(r.emails_total) > 0
                    ? `${r.emails_done}/${r.emails_total} sent`
                    : "—"}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {r.next_send
                    ? new Date(r.next_send).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
