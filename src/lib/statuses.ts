// Single source of truth for the sales pipeline statuses (and priorities),
// shared by server code, client components, and the DB CHECK constraint
// (db/migrations/009). This module is pure — no DB import — so client
// components can use it without pulling server-only packages into the bundle.

export const STATUSES = [
  "New",
  "Contacted",
  "Waiting for reply",
  "Replied",
  "Meeting",
  "Quote Sent",
  "Negotiation",
  "Postponed",
  "Closed Won",
  "Closed Lost",
  "Not Interested",
] as const;
export type Status = (typeof STATUSES)[number];

// Only brand-new leads appear on the map / route planner.
export const ACTIONABLE_STATUS = "New";

// Statuses where the automated email sequence stops (lead engaged or done).
export const STOP_STATUSES: string[] = [
  "Replied",
  "Meeting",
  "Quote Sent",
  "Negotiation",
  "Postponed",
  "Closed Won",
  "Closed Lost",
  "Not Interested",
];

// Statuses still being actively chased (WhatsApp follow-ups due, email bumps).
export const ACTIVE_STATUSES: string[] = ["New", "Contacted", "Waiting for reply"];

// In-progress statuses used for the "follow-ups due" dashboard list.
export const IN_PROGRESS_STATUSES: string[] = [
  "Contacted",
  "Waiting for reply",
  "Replied",
  "Meeting",
  "Quote Sent",
  "Negotiation",
  "Postponed",
];

export const PRIORITIES = ["Hot", "High", "Standard"] as const;
export const EMAIL_STATUSES = ["Valid", "Catch-all"] as const;

// Hex colors for inline styles (map pins, solid badges).
export const STATUS_COLORS: Record<string, string> = {
  New: "#0ea5e9",
  Contacted: "#6366f1",
  "Waiting for reply": "#eab308",
  Replied: "#a855f7",
  Meeting: "#f59e0b",
  "Quote Sent": "#f97316",
  Negotiation: "#14b8a6",
  Postponed: "#64748b",
  "Closed Won": "#16a34a",
  "Closed Lost": "#dc2626",
  "Not Interested": "#9ca3af",
};

// Tailwind chip classes (soft background + text) for selectable chips.
export const STATUS_CHIP: Record<string, string> = {
  New: "bg-sky-100 text-sky-700",
  Contacted: "bg-indigo-100 text-indigo-700",
  "Waiting for reply": "bg-yellow-100 text-yellow-700",
  Replied: "bg-purple-100 text-purple-700",
  Meeting: "bg-amber-100 text-amber-700",
  "Quote Sent": "bg-orange-100 text-orange-700",
  Negotiation: "bg-teal-100 text-teal-700",
  Postponed: "bg-slate-100 text-slate-600",
  "Closed Won": "bg-emerald-100 text-emerald-700",
  "Closed Lost": "bg-rose-100 text-rose-700",
  "Not Interested": "bg-gray-200 text-gray-600",
};

export const PRIORITY_CHIP: Record<string, string> = {
  Hot: "bg-rose-100 text-rose-700",
  High: "bg-orange-100 text-orange-700",
  Standard: "bg-blue-100 text-blue-700",
};
export const PRIORITY_ICON: Record<string, string> = {
  Hot: "🔥",
  High: "⭐",
  Standard: "📋",
};
