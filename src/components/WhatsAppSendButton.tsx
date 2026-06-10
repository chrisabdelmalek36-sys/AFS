"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Opens WhatsApp with the step's message pre-filled (nothing sends until the
// user taps send in WhatsApp), then records the step as sent.

export function waUrl(
  phone: string | null,
  phoneNorm: string | null,
  text: string,
): string | null {
  const num = phoneNorm ? `20${phoneNorm}` : (phone ?? "").replace(/[^\d]/g, "");
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

export default function WhatsAppSendButton({
  messageId,
  phone,
  phoneNorm,
  text,
  sent,
  label = "Open WhatsApp & mark sent",
}: {
  messageId: number;
  phone: string | null;
  phoneNorm: string | null;
  text: string;
  sent: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const url = waUrl(phone, phoneNorm, text);

  if (sent) {
    return <span className="text-xs font-medium text-emerald-600">✓ Sent</span>;
  }
  if (!url) {
    return <span className="text-xs text-slate-400">No phone number</span>;
  }

  async function go() {
    window.open(url!, "_blank", "noopener");
    setBusy(true);
    try {
      await fetch(`/api/outreach/${messageId}/sent`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={go}
      disabled={busy}
      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
    >
      {busy ? "Opening…" : label}
    </button>
  );
}
