import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getLead, contactHistory, STATUSES } from "@/lib/leads";
import { q } from "@/lib/db";
import { Card, TierBadge, StatusBadge, egp } from "@/components/ui";
import { visitBrief, whatsappDraft } from "@/lib/brief";

export const dynamic = "force-dynamic";

export default async function LeadPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const lead = await getLead(id);
  if (!lead) notFound();
  const history = await contactHistory(id);
  const brief = visitBrief(lead);

  async function logContact(formData: FormData) {
    "use server";
    const channel = String(formData.get("channel") ?? "note");
    const note = String(formData.get("note") ?? "").slice(0, 2000);
    const newStatus = String(formData.get("status") ?? "");
    await q(
      `INSERT INTO contact_history (lead_id, channel, direction, note, new_status)
       VALUES ($1,$2,'out',$3,$4)`,
      [id, channel, note || null, newStatus || null],
    );
    await q(
      `UPDATE leads
          SET last_contacted_at = now(),
              status = COALESCE(NULLIF($2,''), status)
        WHERE id=$1`,
      [id, newStatus],
    );
    revalidatePath(`/lead/${id}`);
  }

  const waPhone = lead.phone_norm
    ? `20${lead.phone_norm}`
    : (lead.phone ?? "").replace(/[^\d]/g, "");
  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(
    whatsappDraft(lead),
  )}`;

  return (
    <div className="space-y-4">
      <Link href="/leads" className="text-sm text-violet-700 hover:underline">
        ← Back to leads
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{lead.name}</h1>
        <TierBadge tier={lead.tier} />
        <StatusBadge status={lead.status} />
        {lead.suppressed && (
          <span className="rounded bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
            DO NOT CONTACT
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Details" className="lg:col-span-1">
          <dl className="space-y-2 text-sm">
            <Row k="Category" v={`${lead.category ?? "—"} ${lead.sub_category ? `(${lead.sub_category})` : ""}`} />
            <Row k="Address" v={lead.address ?? "—"} />
            <Row k="City / Region" v={[lead.city, lead.region].filter(Boolean).join(" · ") || "—"} />
            <Row k="Phone" v={lead.phone ?? "—"} />
            <Row k="Website" v={lead.website ?? "—"} />
            <Row k="Email" v={lead.email ?? "—"} />
            <Row k="Deal estimate" v={`${egp(lead.est_deal_min_egp)} – ${egp(lead.est_deal_max_egp)}`} />
            <Row k="Why this tier" v={lead.tier_reason ?? "—"} />
            <Row k="Freshness" v={String(lead.freshness)} />
            <Row k="Source" v={lead.source_primary ?? "—"} />
            <Row k="Discovered" v={new Date(lead.discovered_date).toLocaleDateString()} />
            <Row k="Last contacted" v={lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleString() : "never"} />
          </dl>
          {lead.source_url && (
            <a href={lead.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-violet-700 underline">
              View source ↗
            </a>
          )}
        </Card>

        <Card title="Outreach (Phase 2: draft & manual send)" className="lg:col-span-2">
          {lead.suppressed ? (
            <p className="text-sm text-rose-600">
              This lead is on the do-not-contact list ({lead.suppressed_reason ?? "blocked"}).
              All outreach is disabled.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <a
                  href={waPhone ? waUrl : undefined}
                  target="_blank"
                  rel="noreferrer"
                  className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                    waPhone ? "bg-emerald-600 hover:bg-emerald-700" : "cursor-not-allowed bg-slate-300"
                  }`}
                >
                  Open WhatsApp (prefilled, you press send)
                </a>
                {lead.website && (
                  <a href={lead.website} target="_blank" rel="noreferrer" className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">
                    Visit website
                  </a>
                )}
              </div>
              <p className="text-xs text-slate-500">
                WhatsApp Mode 1 (safe): opens with the message pre-typed — nothing
                is sent until you tap send. Personalised AI drafts arrive in Phase 3.
              </p>

              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="mb-1 font-semibold text-slate-600">Visit brief</p>
                <p className="text-xs text-slate-500">{brief.address}</p>
                <p className="mt-2"><b>Ask for:</b> {brief.askFor}</p>
                <p className="mt-1"><b>Bring:</b> {brief.bring.join(", ")}</p>
                <p className="mt-1"><b>Openers:</b></p>
                <ul className="ml-4 list-disc text-slate-700">
                  {brief.openers.map((o) => <li key={o}>{o}</li>)}
                </ul>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card title="Log contact / update status">
        <form action={logContact} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-500">Channel</span>
            <select name="channel" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              {["visit", "whatsapp", "email", "phone", "linkedin", "note"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-500">Move to status</span>
            <select name="status" defaultValue="" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">(keep {lead.status})</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="grow text-sm">
            <span className="mb-1 block text-xs text-slate-500">Note</span>
            <input name="note" placeholder="e.g. Spoke to procurement, send catalogue" className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
          </label>
          <button className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
            Save
          </button>
        </form>
      </Card>

      <Card title={`Contact history (${history.length})`}>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">No contact logged yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex items-start justify-between py-2">
                <div>
                  <span className="font-medium">{h.channel}</span>
                  {h.new_status && <span className="ml-2 text-xs text-slate-500">→ {h.new_status}</span>}
                  {h.note && <p className="text-slate-600">{h.note}</p>}
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {new Date(h.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-1.5 last:border-0">
      <dt className="shrink-0 text-slate-500">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
