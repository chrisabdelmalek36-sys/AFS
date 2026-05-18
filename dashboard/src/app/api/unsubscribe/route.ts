import { q } from "@/lib/db";
import { verifyUnsub } from "@/lib/compliance";
import { normalizeName } from "@/lib/leads";

export const dynamic = "force-dynamic";

// Permanent, irreversible opt-out across ALL channels (PDPL / CAN-SPAM).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("lead"));
  const token = url.searchParams.get("token") ?? "";

  const page = (msg: string, ok: boolean) =>
    new Response(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<body style="font-family:system-ui;max-width:560px;margin:60px auto;padding:0 20px;color:#0f172a">` +
        `<h2>${ok ? "You're unsubscribed" : "Link problem"}</h2>` +
        `<p>${msg}</p></body>`,
      { status: ok ? 200 : 400, headers: { "content-type": "text/html" } },
    );

  if (!Number.isFinite(id) || !verifyUnsub(id, token))
    return page("This unsubscribe link is invalid or expired.", false);

  const rows = await q<{
    name: string; phone_norm: string | null; email: string | null;
  }>(`SELECT name, phone_norm, email FROM leads WHERE id=$1`, [id]);
  const lead = rows[0];
  if (!lead) return page("This contact no longer exists.", false);

  await q(
    `INSERT INTO do_not_contact (phone_norm, email, name_norm, channel, reason)
     VALUES ($1,$2,$3,'all','Unsubscribed via email link')`,
    [lead.phone_norm ?? "", lead.email, normalizeName(lead.name)],
  );
  await q(
    `UPDATE leads
        SET suppressed=true,
            suppressed_reason=COALESCE(suppressed_reason,'Unsubscribed')
      WHERE id=$1`,
    [id],
  );
  await q(
    `UPDATE outreach_messages SET status='skipped', updated_at=now()
      WHERE lead_id=$1 AND status IN ('scheduled','draft')`,
    [id],
  );
  await q(
    `INSERT INTO email_events (lead_id, type) VALUES ($1,'unsubscribe')`,
    [id],
  );

  return page(
    `${lead.name} has been removed and will never be contacted again on any channel.`,
    true,
  );
}
