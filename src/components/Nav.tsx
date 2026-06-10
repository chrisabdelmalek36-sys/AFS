"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: [string, string][] = [
  ["/today", "Today"],
  ["/dashboard", "Dashboard"],
  ["/leads", "Leads"],
  ["/database", "Database"],
  ["/map", "Map"],
  ["/outreach", "Outreach"],
  ["/digest", "Digest"],
];

// Sticky, responsive top bar. Highlights the active section and stays usable
// on a phone (the links scroll horizontally instead of wrapping).
export default function Nav() {
  const pathname = usePathname() ?? "";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-bold text-slate-900"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-sm font-black text-white">
            A
          </span>
          AFS <span className="text-violet-600">Lead Engine</span>
        </Link>
        <nav className="-mx-1 flex gap-1 overflow-x-auto sm:mx-0">
          {ITEMS.map(([href, label]) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
