"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface Cat {
  key: string;
  label: string;
}
export interface AreaOpt {
  key: string;
  label: string;
  group: string;
}

// Pick the lead types + the area, then pull real businesses of exactly those
// types from OpenStreetMap in that area.
export default function TargetedSearch({
  categories,
  areas,
  groups,
}: {
  categories: Cat[];
  areas: AreaOpt[];
  groups: string[];
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [areaKey, setAreaKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<
    { inserted: number; updated: number; area: string } | null
  >(null);

  const area = areas.find((a) => a.key === areaKey);

  function toggle(key: string) {
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  }

  async function run() {
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/scan/targeted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaKey, categories: picked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResult({ inserted: data.inserted, updated: data.updated, area: data.area });
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  const canRun = picked.length > 0 && !!areaKey && !busy;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-600">
          1 · Which lead types?
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = picked.includes(c.key);
            return (
              <button
                key={c.key}
                onClick={() => toggle(c.key)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  on
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {on ? "✓ " : ""}
                {c.label}
              </button>
            );
          })}
        </div>
        {picked.length > 0 && (
          <button
            onClick={() => setPicked([])}
            className="mt-2 text-xs text-slate-400 hover:text-slate-600"
          >
            Clear ({picked.length} selected)
          </button>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-600">
          2 · Which area?
        </p>
        <select
          value={areaKey}
          onChange={(e) => setAreaKey(e.target.value)}
          className="w-full max-w-sm rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Choose an area…</option>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {areas
                .filter((a) => a.group === g)
                .map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={run}
          disabled={!canRun}
          className="rounded-md bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? "Searching OpenStreetMap…"
            : `Find leads${area ? ` in ${area.label}` : ""}`}
        </button>
        {busy && (
          <span className="text-xs text-slate-500">
            Pulling real businesses — this can take 10–30 seconds.
          </span>
        )}
      </div>

      {err && <p className="text-sm text-rose-600">{err}</p>}

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-semibold text-emerald-800">
            Done — {result.inserted} new lead{result.inserted === 1 ? "" : "s"} added
            {result.updated > 0 ? `, ${result.updated} refreshed` : ""} in {result.area}.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href="/leads"
              className="font-medium text-violet-700 hover:underline"
            >
              View in Leads →
            </Link>
            {area && (
              <Link
                href={`/map?area=${area.key}`}
                className="font-medium text-violet-700 hover:underline"
              >
                Open on map →
              </Link>
            )}
          </div>
          {result.inserted === 0 && result.updated === 0 && (
            <p className="mt-1 text-xs text-emerald-700">
              No new matches this time — try more types or a nearby area.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
