"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STATUSES, STATUS_COLORS } from "@/lib/statuses";

// Kanban pipeline: one column per status, drag a lead card between columns
// to change its status (native HTML5 DnD — no extra dependencies). Each card
// also has a status dropdown as the touch/mobile fallback, since HTML5 drag
// events don't fire on touchscreens.

export interface KanbanLead {
  id: number;
  name: string;
  tier: string | null;
  category: string | null;
  city: string | null;
  deal: string;
  contact_person: string | null;
  status: string;
}

const TIER_DOT: Record<string, string> = {
  Platinum: "#7c3aed",
  Gold: "#d97706",
  Silver: "#64748b",
};

export default function KanbanBoard({ leads }: { leads: KanbanLead[] }) {
  const router = useRouter();
  // Optimistic status overrides applied on drop, so the card moves instantly.
  const [moved, setMoved] = useState<Record<number, string>>({});
  const [dragId, setDragId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const effective = useMemo(
    () => leads.map((l) => ({ ...l, status: moved[l.id] ?? l.status })),
    [leads, moved],
  );

  const byStatus = useMemo(() => {
    const m = new Map<string, KanbanLead[]>();
    for (const s of STATUSES) m.set(s, []);
    for (const l of effective) (m.get(l.status) ?? m.get("New"))!.push(l);
    return m;
  }, [effective]);

  async function moveTo(id: number, status: string) {
    const lead = effective.find((l) => l.id === id);
    if (!lead || lead.status === status) return;
    setMoved((m) => ({ ...m, [id]: status })); // move card immediately
    setSaving(true);
    try {
      const r = await fetch(`/api/lead/${id}/contact`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error();
      router.refresh();
    } catch {
      // Roll the card back if the save failed.
      setMoved((m) => {
        const { [id]: _, ...rest } = m;
        return rest;
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        Drag a card to another column to change its status
        {saving ? " · saving…" : ""}. On a phone, use the dropdown on the card.
      </p>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
        {STATUSES.map((status) => {
          const col = byStatus.get(status) ?? [];
          const color = STATUS_COLORS[status] ?? "#64748b";
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(status);
              }}
              onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setOverCol(null);
                if (dragId != null) moveTo(dragId, status);
              }}
              className={`flex w-64 shrink-0 flex-col rounded-2xl border bg-slate-50/80 transition-colors ${
                overCol === status
                  ? "border-violet-400 bg-violet-50"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {status}
                </h2>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 tnum">
                  {col.length}
                </span>
              </div>

              <div className="flex min-h-[8rem] flex-col gap-2 px-2 pb-2">
                {col.map((l) => (
                  <div
                    key={l.id}
                    draggable
                    onDragStart={(e) => {
                      setDragId(l.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragId(null)}
                    className={`cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing ${
                      dragId === l.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      {l.tier && TIER_DOT[l.tier] && (
                        <span
                          title={l.tier}
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: TIER_DOT[l.tier] }}
                        />
                      )}
                      <Link
                        href={`/lead/${l.id}`}
                        className="line-clamp-2 text-sm font-medium text-slate-800 hover:text-violet-700 hover:underline"
                      >
                        {l.name}
                      </Link>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {[l.category, l.city].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-600 tnum">
                        {l.deal}
                      </span>
                      {l.contact_person && (
                        <span className="line-clamp-1 text-xs text-slate-400">
                          {l.contact_person}
                        </span>
                      )}
                    </div>
                    {/* Touch fallback: change status without dragging */}
                    <select
                      value={l.status}
                      onChange={(e) => moveTo(l.id, e.target.value)}
                      className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-xs text-slate-600 sm:hidden"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                {col.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-slate-300">
                    Drop here
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
