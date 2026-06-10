"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Deletes a lead for good (with confirm). The engine remembers the deletion,
// so the daily scan won't re-import the same business.
export default function DeleteLeadButton({
  id,
  name,
  small = false,
  redirectTo,
}: {
  id: number;
  name: string;
  small?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del() {
    if (
      !window.confirm(
        `Delete "${name}" permanently?\n\nIt will be removed everywhere and will NOT come back in future scans.`,
      )
    )
      return;
    setBusy(true);
    try {
      const r = await fetch(`/api/lead/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch {
      setBusy(false);
      window.alert("Delete failed — try again.");
    }
  }

  if (small) {
    return (
      <button
        onClick={del}
        disabled={busy}
        title="Delete lead (never comes back)"
        className="rounded px-1.5 py-0.5 text-xs text-slate-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
      >
        🗑
      </button>
    );
  }
  return (
    <button
      onClick={del}
      disabled={busy}
      className="rounded-md border border-rose-200 bg-rose-50 px-4 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-50"
    >
      {busy ? "Deleting…" : "Delete lead"}
    </button>
  );
}
