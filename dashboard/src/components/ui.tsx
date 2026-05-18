import Link from "next/link";
import type { ReactNode } from "react";

export const TIER_COLORS: Record<string, string> = {
  Platinum: "#7c3aed",
  Gold: "#d97706",
  Silver: "#64748b",
  Unrated: "#94a3b8",
};

export const STATUS_COLORS: Record<string, string> = {
  New: "#0ea5e9",
  Contacted: "#6366f1",
  Replied: "#a855f7",
  Meeting: "#f59e0b",
  "Quote Sent": "#f97316",
  "Closed Won": "#16a34a",
  "Closed Lost": "#dc2626",
};

export function TierBadge({ tier }: { tier: string | null }) {
  const t = tier ?? "Unrated";
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: TIER_COLORS[t] ?? "#94a3b8" }}
    >
      {t}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: STATUS_COLORS[status] ?? "#64748b" }}
    >
      {status}
    </span>
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {title && <h2 className="mb-3 text-sm font-semibold text-slate-500">{title}</h2>}
      {children}
    </div>
  );
}

export function egp(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  if (!v) return "—";
  if (v >= 1_000_000) return `EGP ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `EGP ${Math.round(v / 1000)}K`;
  return `EGP ${v}`;
}

export function Nav() {
  const items = [
    ["/dashboard", "Dashboard"],
    ["/leads", "Leads"],
    ["/map", "Map"],
    ["/outreach", "Outreach"],
  ];
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
        <Link href="/dashboard" className="text-lg font-bold text-slate-900">
          AFS <span className="text-violet-600">Lead Engine</span>
        </Link>
        <nav className="flex gap-1">
          {items.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
