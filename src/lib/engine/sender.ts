import { config } from "./config";
import { query } from "../db";
import { log } from "./util/logger";

// Sequence stops the moment a lead engages or opts out.
const STOP_STATUSES = [
  "Replied", "Meeting", "Quote Sent", "Postponed", "Closed Won", "Closed Lost",
];

interface DueRow {
  id: number;
  lead_id: number;
  step_label: string;
  subject: string | null;
  body: string;
  email: string | null;
  lead_status: string;
  suppressed: boolean;
}

async function sendViaResend(
  to: string,
  subject: string,
  text: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.outreach.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.outreach.fromEmail,
        to,
        subject,
        text,
      }),
    });
    if (!res.ok) return { ok: false, error: `resend ${res.status}` };
    const j = (await res.json()) as { id?: string };
    return { ok: true, id: j.id };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function processOutreachQueue(): Promise<{
  due: number;
  sent: number;
  simulated: number;
  skipped: number;
}> {
  const res = await query<DueRow>(
    `SELECT m.id, m.lead_id, m.step_label, m.subject, m.body,
            l.email, l.status AS lead_status, l.suppressed
       FROM outreach_messages m
       JOIN leads l ON l.id = m.lead_id
      WHERE m.channel='email' AND m.status='scheduled'
        AND m.scheduled_for <= now()
      ORDER BY m.scheduled_for
      LIMIT 200`,
  );
  const rows = res.rows;

  let sent = 0,
    simulated = 0,
    skipped = 0;

  for (const r of rows) {
    // Compliance + engagement gates.
    if (r.suppressed || STOP_STATUSES.includes(r.lead_status)) {
      await query(
        `UPDATE outreach_messages SET status='skipped', updated_at=now(),
            error=$2 WHERE id=$1`,
        [r.id, r.suppressed ? "do-not-contact" : `lead status: ${r.lead_status}`],
      );
      skipped++;
      continue;
    }

    const canLiveSend =
      config.outreach.liveSend &&
      !!config.outreach.resendApiKey &&
      !!r.email;

    if (canLiveSend) {
      const out = await sendViaResend(
        r.email!,
        r.subject ?? "AFS Trade",
        r.body,
      );
      if (out.ok) {
        await query(
          `UPDATE outreach_messages
              SET status='sent', provider='resend', provider_msg_id=$2,
                  sent_at=now(), updated_at=now() WHERE id=$1`,
          [r.id, out.id ?? null],
        );
        sent++;
      } else {
        await query(
          `UPDATE outreach_messages
              SET status='failed', error=$2, updated_at=now() WHERE id=$1`,
          [r.id, out.error ?? "send failed"],
        );
      }
    } else {
      // Safe default: no key / live-send off / no email → simulate.
      await query(
        `UPDATE outreach_messages
            SET status='simulated', provider='simulated', sent_at=now(),
                updated_at=now() WHERE id=$1`,
        [r.id],
      );
      simulated++;
    }

    await query(
      `INSERT INTO contact_history (lead_id, channel, direction, note)
       VALUES ($1,'email','out',$2)`,
      [r.lead_id, `Auto sequence ${r.step_label} (${canLiveSend ? "sent" : "simulated"})`],
    );
    await query(
      `UPDATE leads SET last_contacted_at=now(),
          status=CASE WHEN status='New' THEN 'Contacted' ELSE status END
        WHERE id=$1`,
      [r.lead_id],
    );
  }

  log.info(
    `Outreach queue: ${rows.length} due → ${sent} sent, ${simulated} simulated, ${skipped} skipped`,
  );
  return { due: rows.length, sent, simulated, skipped };
}
