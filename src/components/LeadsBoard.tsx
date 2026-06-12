"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  STATUSES,
  PRIORITIES,
  STATUS_CHIP,
  PRIORITY_CHIP,
  PRIORITY_ICON,
} from "@/lib/statuses";
import DeleteLeadButton from "@/components/DeleteLeadButton";

// A Notion-style, fully inline-editable database of leads — mirrors the AFS
// Notion "Lead Generation Database": Name, Company, Job Title, Email,
// Email Status, LinkedIn, Location, Est. Deal Size, Priority, Status, Notes.

export interface BoardLead {
  id: number;
  company: string;
  contact_person: string | null;
  contact_title: string | null;
  email: string | null;
  email_status: string | null;
  linkedin_url: string | null;
  location: string | null;
  deal: string;
  priority: string | null;
  status: string;
  category: string | null;
  notes: string | null;
  suppressed: boolean;
}

async function patch(id: number, body: Record<string, unknown>) {
  await fetch(`/api/lead/${id}/contact`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function TextCell({
  value,
  placeholder,
  onSave,
  className = "",
}: {
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  if (editing)
    return (
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (v !== value) onSave(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setV(value);
            setEditing(false);
          }
        }}
        className="w-full rounded border border-violet-300 px-1.5 py-0.5 text-xs"
      />
    );
  return (
    <button
      onClick={() => setEditing(true)}
      className={`block w-full truncate text-left text-xs hover:bg-slate-50 ${
        value ? "text-slate-700" : "text-slate-300"
      } ${className}`}
    >
      {value || placeholder}
    </button>
  );
}

function Chip({
  value,
  options,
  styleMap,
  iconMap,
  onSave,
}: {
  value: string | null;
  options: string[];
  styleMap: Record<string, string>;
  iconMap?: Record<string, string>;
  onSave: (v: string) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onSave(e.target.value)}
      className={`cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium ${
        value ? styleMap[value] ?? "bg-slate-100 text-slate-600" : "bg-slate-50 text-slate-400"
      }`}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {iconMap?.[o] ? `${iconMap[o]} ${o}` : o}
        </option>
      ))}
    </select>
  );
}

export default function LeadsBoard({ leads }: { leads: BoardLead[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fCategory, setFCategory] = useState("");

  const categories = useMemo(
    () => [...new Set(leads.map((l) => l.category).filter(Boolean) as string[])].sort(),
    [leads],
  );

  const rows = useMemo(
    () =>
      leads.filter((l) => {
        if (fPriority && l.priority !== fPriority) return false;
        if (fStatus && l.status !== fStatus) return false;
        if (fCategory && l.category !== fCategory) return false;
        if (q) {
          const hay = `${l.company} ${l.contact_person ?? ""} ${l.email ?? ""} ${l.location ?? ""}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [leads, q, fPriority, fStatus, fCategory],
  );

  async function save(id: number, body: Record<string, unknown>) {
    await patch(id, body);
    router.refresh();
  }

  const selCls = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search company, contact, email…"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <select value={fPriority} onChange={(e) => setFPriority(e.target.value)} className={selCls}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_ICON[p]} {p}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={selCls}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={fCategory} onChange={(e) => setFCategory(e.target.value)} className={selCls}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-sm text-slate-500">{rows.length} shown</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              {["Status", "Priority", "Contact", "Company", "Job title", "Email", "LinkedIn", "Location", "Deal (EGP)", "Notes", ""].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className={`border-t border-slate-100 align-top ${l.suppressed ? "opacity-50" : ""}`}>
                <td className="px-3 py-2">
                  <Chip value={l.status} options={[...STATUSES]} styleMap={STATUS_CHIP} onSave={(v) => save(l.id, { status: v })} />
                </td>
                <td className="px-3 py-2">
                  <Chip value={l.priority} options={[...PRIORITIES]} styleMap={PRIORITY_CHIP} iconMap={PRIORITY_ICON} onSave={(v) => save(l.id, { priority: v })} />
                </td>
                <td className="min-w-[140px] px-3 py-2">
                  <TextCell value={l.contact_person ?? ""} placeholder="+ name" onSave={(v) => save(l.id, { contact_person: v })} className="font-medium" />
                </td>
                <td className="min-w-[160px] px-3 py-2">
                  <Link href={`/lead/${l.id}`} className="block truncate font-medium text-violet-700 hover:underline">
                    {l.company}
                  </Link>
                </td>
                <td className="min-w-[140px] px-3 py-2">
                  <TextCell value={l.contact_title ?? ""} placeholder="+ title" onSave={(v) => save(l.id, { contact_title: v })} />
                </td>
                <td className="min-w-[180px] px-3 py-2">
                  <div className="flex items-center gap-1">
                    {l.email && <span className="shrink-0" title={l.email_status ?? ""}>{l.email_status === "Valid" ? "✅" : l.email_status === "Catch-all" ? "📧" : ""}</span>}
                    <TextCell value={l.email ?? ""} placeholder="+ email" onSave={(v) => save(l.id, { email: v })} />
                  </div>
                </td>
                <td className="min-w-[130px] px-3 py-2">
                  {l.linkedin_url ? (
                    <a href={l.linkedin_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-[#0a66c2] hover:underline">
                      in/profile ↗
                    </a>
                  ) : (
                    <TextCell value="" placeholder="+ paste URL" onSave={(v) => save(l.id, { linkedin_url: v })} />
                  )}
                </td>
                <td className="min-w-[120px] px-3 py-2 text-xs text-slate-600">{l.location ?? "—"}</td>
                <td className="min-w-[120px] whitespace-nowrap px-3 py-2 text-xs text-slate-600">{l.deal}</td>
                <td className="min-w-[200px] px-3 py-2">
                  <TextCell value={l.notes ?? ""} placeholder="+ note" onSave={(v) => save(l.id, { notes: v })} />
                </td>
                <td className="px-2 py-2 text-right">
                  <DeleteLeadButton id={l.id} name={l.company} small />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-slate-400">
                  No leads match. Use <a href="/find" className="font-semibold text-violet-700 underline">Find leads</a> to pull more, or clear the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
