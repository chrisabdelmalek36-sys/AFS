"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUSES, STATUS_CHIP } from "@/lib/statuses";

// A compact, editable status chip. Changing it PATCHes the lead and refreshes
// the page. Used on the Leads and Outreach tables so any status can be set
// inline, the same way as the Database board.

export default function StatusSelect({
  id,
  status,
  disabled = false,
}: {
  id: number;
  status: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    if (next === status) return;
    setBusy(true);
    try {
      await fetch(`/api/lead/${id}/contact`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={status}
      disabled={disabled || busy}
      onChange={(e) => change(e.target.value)}
      className={`cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium disabled:opacity-60 ${
        STATUS_CHIP[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
