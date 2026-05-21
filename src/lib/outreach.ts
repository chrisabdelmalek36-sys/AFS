import { q } from "./db";
import { AFS, emailFooter } from "./compliance";
import type { Lead } from "./leads";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const KEY = process.env.ANTHROPIC_API_KEY ?? "";

const BRAND =
  "AFS Trade is the 33-year sole distributor of Nardi (premium Italian " +
  "outdoor furniture) in Egypt. Reference projects: Mövenpick Soma Bay, " +
  "Stella Di Mare, Emaar Mivida. Tone: professional, concise, Egyptian B2B, " +
  "no hype, value-led. Average deal EGP 200K–5M.";

export interface EmailStep {
  index: number;
  label: string;
  offsetDays: number;
  intent: string;
}

export const EMAIL_SEQUENCE: EmailStep[] = [
  { index: 0, label: "Day 0", offsetDays: 0, intent: "Warm introduction: who AFS is, why relevant to THIS lead, soft ask for a short call or to send the catalogue." },
  { index: 1, label: "Day 3", offsetDays: 3, intent: "Short polite bump on the first email. 3 sentences max." },
  { index: 2, label: "Day 8", offsetDays: 8, intent: "Value-add: a relevant reference project / proof point for their category. No pressure." },
  { index: 3, label: "Day 15", offsetDays: 15, intent: "Direct ask: propose a specific next step (15-min call or a tailored quote)." },
  { index: 4, label: "Day 30", offsetDays: 30, intent: "Polite close-out / break-up email, leave the door open." },
];

interface Generated {
  email: { index: number; subject: string; body: string }[];
  whatsapp: string;
  linkedin: string;
  visit: string;
}

function newsHeadline(lead: Lead): string {
  const raw = lead as unknown as { raw?: { headline?: string } };
  return raw.raw?.headline ?? "";
}

// ---- Template fallback (used when no ANTHROPIC_API_KEY) ----
function templates(lead: Lead): Generated {
  const cat = lead.category ?? "business";
  const news = newsHeadline(lead);
  const newsLine = news
    ? ` We saw the news: "${news}" — congratulations.`
    : "";
  const hook =
    cat.includes("hotel") || cat.includes("resort")
      ? "your outdoor, pool and terrace areas"
      : cat.includes("developer") || cat.includes("compound")
        ? "your clubhouses, landscapes and amenity areas"
        : cat.includes("restaurant") || cat.includes("cafe")
          ? "your outdoor seating and terraces"
          : "your outdoor common areas";

  const email = EMAIL_SEQUENCE.map((s) => {
    let subject = `${AFS.company} × ${lead.name} — Nardi outdoor furniture`;
    let body = "";
    if (s.index === 0)
      body =
        `Dear ${lead.name} team,\n\n` +
        `I'm reaching out from ${AFS.company}, the 33-year sole distributor ` +
        `of Nardi premium Italian outdoor furniture in Egypt.${newsLine} ` +
        `We supply ${hook} for projects like Mövenpick Soma Bay and Emaar ` +
        `Mivida.\n\nWould it help if I sent our catalogue, or arranged a ` +
        `short call to understand your plans?`;
    else if (s.index === 1) {
      subject = `Re: ${subject}`;
      body = `Just floating this back to the top of your inbox — happy to send the Nardi catalogue or set up 15 minutes whenever it suits.`;
    } else if (s.index === 2) {
      subject = `A relevant reference for ${lead.name}`;
      body =
        `Sharing a quick proof point: our Nardi pieces are UV- and ` +
        `salt-resistant and are in daily commercial use at several Red Sea ` +
        `and New Cairo properties. Glad to share the spec sheet relevant to ${cat}.`;
    } else if (s.index === 3) {
      subject = `Next step for ${lead.name}?`;
      body =
        `Could we book a 15-minute call this week, or would a tailored ` +
        `quote for ${hook} be more useful first? Either works.`;
    } else {
      subject = `Closing the loop`;
      body =
        `I won't keep emailing — if outdoor furniture isn't a priority now, ` +
        `no problem at all. Whenever it is, ${AFS.company} is one reply away.`;
    }
    return { index: s.index, subject, body: body + emailFooter(lead.id) };
  });

  const whatsapp =
    `Hello ${lead.name}, this is ${AFS.company} — 33-year Nardi (Italy) ` +
    `outdoor furniture distributor in Egypt (refs: Mövenpick Soma Bay, ` +
    `Emaar Mivida).${newsLine} Could I send our catalogue or arrange a ` +
    `quick visit for ${hook}?`;

  const linkedin =
    `Hi — ${AFS.company} here (33-yr Nardi distributor in Egypt). We work ` +
    `with ${cat}s on premium outdoor furniture. Would love to connect and ` +
    `share relevant references for ${lead.name}.`;

  const visit =
    `VISIT BRIEF — ${lead.name} (${lead.tier ?? "Unrated"} ${cat})\n` +
    `Address: ${lead.address ?? "—"}\n` +
    `Ask for: procurement / facilities / FF&E decision-maker\n` +
    `Bring: mini Nardi catalogue, business card, fabric swatch\n` +
    `Openers:\n` +
    `1) ${news ? `Saw "${news}" — are outdoor areas in that scope?` : `Any outdoor furnishing projects coming up?`}\n` +
    `2) We supplied ${hook} at Mövenpick Soma Bay — references available.\n` +
    `3) We hold popular Nardi models in Egypt stock — short lead times.`;

  return { email, whatsapp, linkedin, visit };
}

// Drop any message whose text content is empty/whitespace. Anthropic returns
// 400 "text content blocks must be non-empty" otherwise.
type AnthropicMessage = { role: "user" | "assistant"; content: string };
function sanitizeMessages(msgs: AnthropicMessage[]): AnthropicMessage[] {
  return msgs.filter((m) => typeof m.content === "string" && m.content.trim().length > 0);
}

// ---- Claude generation (used when ANTHROPIC_API_KEY is set) ----
async function claude(lead: Lead): Promise<Generated | null> {
  if (!KEY) return null;
  const news = newsHeadline(lead);
  const prompt =
    `${BRAND}\n\n` +
    `Write outreach for this Egyptian B2B lead.\n` +
    `Lead: ${lead.name}\nCategory: ${lead.category}\nTier: ${lead.tier}\n` +
    `City/Region: ${lead.city ?? "-"} / ${lead.region ?? "-"}\n` +
    `Deal estimate EGP: ${lead.est_deal_min_egp}-${lead.est_deal_max_egp}\n` +
    (news ? `Recent news about them: "${news}"\n` : "") +
    `\nReturn STRICT JSON only, no prose, shape:\n` +
    `{"email":[{"index":0,"subject":"","body":""}... 5 items indexes 0-4],` +
    `"whatsapp":"","linkedin":"","visit":""}\n` +
    `Email steps by index: ` +
    EMAIL_SEQUENCE.map((s) => `${s.index}=${s.label}:${s.intent}`).join(" | ") +
    `\nDo NOT include an unsubscribe footer (added automatically). ` +
    `WhatsApp <=600 chars. LinkedIn <=300 chars. visit = a short visit brief.`;

  const messages = sanitizeMessages([{ role: "user", content: prompt }]);
  if (messages.length === 0) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2500,
        messages,
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { content?: { text?: string }[] };
    const text = j.content?.[0]?.text ?? "";
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as Generated;
    if (!Array.isArray(parsed.email) || parsed.email.length === 0) return null;
    // Always append the compliant footer ourselves.
    parsed.email = parsed.email.map((e) => ({
      ...e,
      body: e.body + emailFooter(lead.id),
    }));
    return parsed;
  } catch {
    return null;
  }
}

export interface GenerateResult {
  skipped?: boolean;
  reason?: string;
  generatedBy: "claude" | "template";
  counts: { email: number; whatsapp: number; linkedin: number; visit: number };
}

export async function generateOutreach(lead: Lead): Promise<GenerateResult> {
  if (lead.suppressed) {
    return {
      skipped: true,
      reason: lead.suppressed_reason ?? "on do-not-contact list",
      generatedBy: "template",
      counts: { email: 0, whatsapp: 0, linkedin: 0, visit: 0 },
    };
  }

  const fromClaude = await claude(lead);
  const g = fromClaude ?? templates(lead);
  const generatedBy = fromClaude ? "claude" : "template";

  for (const e of g.email) {
    const step = EMAIL_SEQUENCE.find((s) => s.index === e.index);
    if (!step) continue;
    await q(
      `INSERT INTO outreach_messages
         (lead_id, channel, step_index, step_label, subject, body,
          status, scheduled_for, generated_by, updated_at)
       VALUES ($1,'email',$2,$3,$4,$5,'scheduled',
               now() + ($6 || ' days')::interval,$7, now())
       ON CONFLICT (lead_id, channel, step_index) DO UPDATE SET
         subject=EXCLUDED.subject, body=EXCLUDED.body,
         generated_by=EXCLUDED.generated_by,
         status=CASE WHEN outreach_messages.status IN ('sent','simulated')
                     THEN outreach_messages.status ELSE 'scheduled' END,
         scheduled_for=EXCLUDED.scheduled_for, updated_at=now()`,
      [lead.id, e.index, step.label, e.subject, e.body, String(step.offsetDays), generatedBy],
    );
  }
  for (const [channel, body] of [
    ["whatsapp", g.whatsapp],
    ["linkedin", g.linkedin],
    ["visit", g.visit],
  ] as const) {
    await q(
      `INSERT INTO outreach_messages
         (lead_id, channel, step_index, step_label, body, status,
          generated_by, updated_at)
       VALUES ($1,$2,0,'draft',$3,'draft',$4, now())
       ON CONFLICT (lead_id, channel, step_index) DO UPDATE SET
         body=EXCLUDED.body, generated_by=EXCLUDED.generated_by,
         updated_at=now()`,
      [lead.id, channel, body, generatedBy],
    );
  }
  await q(`UPDATE leads SET outreach_generated_at=now() WHERE id=$1`, [lead.id]);

  return {
    generatedBy,
    counts: {
      email: g.email.length,
      whatsapp: 1,
      linkedin: 1,
      visit: 1,
    },
  };
}
