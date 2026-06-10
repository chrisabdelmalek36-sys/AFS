import WhatsAppSendButton from "@/components/WhatsAppSendButton";
import type { OutreachMessage } from "@/lib/leads";

// The WhatsApp follow-up sequence for one lead: each scheduled step with its
// date, status and a one-tap send button. The earliest unsent step is the
// one that's actionable; later steps show their scheduled date.

export default function WhatsAppSequence({
  steps,
  phone,
  phoneNorm,
}: {
  steps: OutreachMessage[];
  phone: string | null;
  phoneNorm: string | null;
}) {
  if (steps.length === 0) return null;
  const sorted = [...steps].sort((a, b) => a.step_index - b.step_index);
  const nextIdx = sorted.findIndex((s) => s.status !== "sent");

  return (
    <div className="rounded-lg border border-emerald-200 text-sm">
      <p className="border-b border-emerald-100 bg-emerald-50 px-3 py-2 font-semibold text-emerald-800">
        WhatsApp follow-up sequence
      </p>
      <ul className="divide-y divide-slate-100">
        {sorted.map((m, i) => {
          const due = m.scheduled_for ? new Date(m.scheduled_for) : null;
          const isNext = i === nextIdx;
          return (
            <li key={m.id} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-700">
                  {m.step_label}
                  {m.status === "sent" ? (
                    <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">sent</span>
                  ) : due && due.getTime() > Date.now() ? (
                    <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      due {due.toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">due now</span>
                  )}
                </span>
                {(isNext || m.status === "sent") && (
                  <WhatsAppSendButton
                    messageId={m.id}
                    phone={phone}
                    phoneNorm={phoneNorm}
                    text={m.body}
                    sent={m.status === "sent"}
                  />
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{m.body}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
