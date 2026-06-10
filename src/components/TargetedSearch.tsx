"use client";

import { useState } from "react";
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

// Pick the lead types (preset or your own) + the area(s) — one area, a whole
// region, or several — then pull matching businesses from OpenStreetMap and
// drop the result straight onto the map.
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
  const [custom, setCustom] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [areaKeys, setAreaKeys] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const toggle = (key: string) =>
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  const toggleArea = (key: string) =>
    setAreaKeys((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  function addCustom() {
    const v = customInput.trim().toLowerCase();
    if (v.length >= 2 && !custom.includes(v)) setCustom((c) => [...c, v]);
    setCustomInput("");
  }

  function keysInGroup(g: string) {
    return areas.filter((a) => a.group === g).map((a) => a.key);
  }
  function groupAllOn(g: string) {
    const ks = keysInGroup(g);
    return ks.length > 0 && ks.every((k) => areaKeys.includes(k));
  }
  function toggleGroup(g: string) {
    const ks = keysInGroup(g);
    setAreaKeys((p) =>
      groupAllOn(g) ? p.filter((k) => !ks.includes(k)) : [...new Set([...p, ...ks])],
    );
  }

  async function run() {
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      const res = await fetch("/api/scan/targeted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaKeys, categories: picked, custom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      const found = (data.inserted ?? 0) + (data.updated ?? 0);
      if (found > 0) {
        // Drop the results straight onto the map, framed to the chosen areas.
        router.push(`/map?areas=${encodeURIComponent(areaKeys.join(","))}`);
      } else if (data.busy) {
        setErr(
          "OpenStreetMap is busy right now and didn't respond. Please wait a few seconds and try again — your selection is kept.",
        );
        setBusy(false);
      } else {
        setNote(
          "No new matches in that area for those types. Tip: try broader types (e.g. Restaurant, Cafe), add a custom type, or pick a nearby/larger area. Leads already found before won't be re-added.",
        );
        setBusy(false);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Search failed");
      setBusy(false);
    }
  }

  const totalTypes = picked.length + custom.length;
  const canRun = totalTypes > 0 && areaKeys.length > 0 && !busy;

  return (
    <div className="space-y-5">
      {/* Types */}
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-600">1 · Which lead types?</p>
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

        {/* Custom written types */}
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Add your own type — e.g. spa, mall, gym, beach bar"
              className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button
              onClick={addCustom}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Add
            </button>
          </div>
          {custom.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {custom.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700"
                >
                  {c}
                  <button
                    onClick={() => setCustom((x) => x.filter((k) => k !== c))}
                    className="text-sky-500 hover:text-sky-800"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Custom types are matched by name on the map data (any business
            whose name contains the word).
          </p>
        </div>
      </div>

      {/* Areas */}
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-600">
          2 · Which area(s)?{" "}
          <span className="font-normal text-slate-400">
            pick one, a whole region, or several
          </span>
        </p>
        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g} className="rounded-lg border border-slate-200 p-2">
              <button
                onClick={() => toggleGroup(g)}
                className={`mb-1.5 rounded-md px-2 py-1 text-xs font-semibold ${
                  groupAllOn(g)
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {groupAllOn(g) ? "✓ " : "+ "}All {g}
              </button>
              <div className="flex flex-wrap gap-1.5">
                {areas
                  .filter((a) => a.group === g)
                  .map((a) => {
                    const on = areaKeys.includes(a.key);
                    return (
                      <button
                        key={a.key}
                        onClick={() => toggleArea(a.key)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                          on
                            ? "border-violet-500 bg-violet-100 text-violet-700"
                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {a.label}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
        {areaKeys.length > 0 && (
          <button
            onClick={() => setAreaKeys([])}
            className="mt-2 text-xs text-slate-400 hover:text-slate-600"
          >
            Clear areas ({areaKeys.length} selected)
          </button>
        )}
      </div>

      {/* Run */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={run}
          disabled={!canRun}
          className="rounded-md bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? "Searching & opening map…"
            : `Find leads${
                totalTypes && areaKeys.length
                  ? ` (${totalTypes} type${totalTypes === 1 ? "" : "s"} · ${areaKeys.length} area${areaKeys.length === 1 ? "" : "s"})`
                  : ""
              }`}
        </button>
        {busy && (
          <span className="text-xs text-slate-500">
            Pulling real businesses — this can take 10–40 seconds.
          </span>
        )}
      </div>

      {err && <p className="text-sm text-rose-600">{err}</p>}
      {note && <p className="text-sm text-amber-600">{note}</p>}
    </div>
  );
}
