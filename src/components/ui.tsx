import type { ReactNode } from "react";
import { STATUS_COLORS } from "@/lib/statuses";

export { STATUS_COLORS };
export { default as Nav } from "@/components/Nav";

export const TIER_COLORS: Record<string, string> = {
  Platinum: "#7c3aed",
  Gold: "#d97706",
  Silver: "#64748b",
  Unrated: "#94a3b8",
};

export function TierBadge({ tier }: { tier: string | null }) {
  const t = tier ?? "Unrated";
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: TIER_COLORS[t] ?? "#94a3b8" }}
    >
      {t}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: STATUS_COLORS[status] ?? "#64748b" }}
    >
      {status}
    </span>
  );
}

export function Card({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-black/[0.02] sm:p-5 ${className}`}
    >
      {(title || right) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-slate-500">{title}</h2>
            )}
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// A single headline metric. `tone` tints the value.
export function Kpi({
  label,
  value,
  sub,
  tone = "slate",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "slate" | "violet" | "emerald" | "amber" | "rose" | "sky";
}) {
  const tones: Record<string, string> = {
    slate: "text-slate-900",
    violet: "text-violet-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    sky: "text-sky-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-black/[0.02]">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tnum ${tones[tone]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// A labelled horizontal bar (used for funnel / breakdowns).
export function Bar({
  label,
  value,
  max,
  color = "#7c3aed",
  right,
}: {
  label: ReactNode;
  value: number;
  max: number;
  color?: string;
  right?: ReactNode;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="py-1">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold tnum text-slate-700">{right ?? value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(pct, value > 0 ? 4 : 0)}%`, backgroundColor: color }}
        />
      </div>
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
