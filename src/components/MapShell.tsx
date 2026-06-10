"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { MapLead, MapFocus } from "@/components/LeafletMap";
import { AREAS, AREA_GROUPS, areaByKey, areaZoom, inArea } from "@/lib/areas";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-slate-400">
      Loading map…
    </div>
  ),
});

interface PlannedStop {
  id: number;
  name: string;
  lat: number;
  lng: number;
  tier: string | null;
  address: string | null;
}

export default function MapShell({ leads }: { leads: MapLead[] }) {
  const [areaKey, setAreaKey] = useState("");
  const [maxStops, setMaxStops] = useState(8);
  const [plan, setPlan] = useState<{
    stops: PlannedStop[];
    distanceKm: number;
    optimisedBy: string;
    googleMapsUrl: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const area = areaKey ? areaByKey(areaKey) : undefined;

  // Leads inside the selected area; all leads when no area is chosen.
  const shown = useMemo(
    () => (area ? leads.filter((l) => inArea(area, l.lat, l.lng)) : leads),
    [leads, area],
  );

  // Live lead count per area, so the picker doubles as a heat list.
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of AREAS) {
      m.set(a.key, leads.filter((l) => inArea(a, l.lat, l.lng)).length);
    }
    return m;
  }, [leads]);

  // The busiest areas surface as one-click chips above the map.
  const topAreas = useMemo(
    () =>
      [...AREAS]
        .map((a) => ({ a, n: counts.get(a.key) ?? 0 }))
        .filter((x) => x.n > 0)
        .sort((x, y) => y.n - x.n)
        .slice(0, 8),
    [counts],
  );

  const focus: MapFocus | null = area
    ? {
        lat: area.lat,
        lng: area.lng,
        zoom: areaZoom(area.radiusKm),
        radiusKm: area.radiusKm,
      }
    : null;

  async function planRoute() {
    setBusy(true);
    setErr(null);
    setPlan(null);
    try {
      const res = await fetch("/api/route/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area: area
            ? { lat: area.lat, lng: area.lng, radiusKm: area.radiusKm }
            : undefined,
          maxStops,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to plan route");
      setPlan(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function selectArea(key: string) {
    setAreaKey(key);
    setPlan(null);
    setErr(null);
  }

  return (
    <div className="space-y-3">
      {/* Quick area chips — busiest areas first */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => selectArea("")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            !areaKey
              ? "bg-violet-600 text-white"
              : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          All Egypt · {leads.length}
        </button>
        {topAreas.map(({ a, n }) => (
          <button
            key={a.key}
            onClick={() => selectArea(a.key === areaKey ? "" : a.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              areaKey === a.key
                ? "bg-violet-600 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {a.label} · {n}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="h-[70vh] overflow-hidden rounded-xl border border-slate-200 bg-white">
          <LeafletMap
            leads={shown}
            focus={focus}
            route={plan?.stops.map((s) => ({ lat: s.lat, lng: s.lng })) ?? []}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-500">
              Area
            </h2>
            <select
              value={areaKey}
              onChange={(e) => selectArea(e.target.value)}
              className="mb-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">All Egypt ({leads.length} leads)</option>
              {AREA_GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {AREAS.filter((a) => a.group === g).map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label} ({counts.get(a.key) ?? 0})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {area && (
              <p className="mb-2 text-xs text-slate-500">
                {shown.length} lead{shown.length === 1 ? "" : "s"} to approach
                in {area.label}.
              </p>
            )}

            <h2 className="mb-1 mt-3 text-sm font-semibold text-slate-500">
              Plan a visit route
            </h2>
            <label className="mb-1 block text-xs text-slate-500">
              Max stops: {maxStops}
            </label>
            <input
              type="range"
              min={2}
              max={23}
              value={maxStops}
              onChange={(e) => setMaxStops(Number(e.target.value))}
              className="mb-3 w-full"
            />
            <button
              onClick={planRoute}
              disabled={busy || (area != null && shown.length < 2)}
              className="w-full rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {busy
                ? "Planning…"
                : `Plan route${area ? ` in ${area.label}` : ""}`}
            </button>
            {area != null && shown.length < 2 && (
              <p className="mt-2 text-xs text-slate-500">
                Need at least 2 leads in this area to plan a route.
              </p>
            )}
            {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
          </div>

          {plan && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-500">
                  Route · {plan.stops.length} stops
                </h2>
                <span className="text-xs text-slate-400">
                  ~{plan.distanceKm} km · {plan.optimisedBy}
                </span>
              </div>
              <a
                href={plan.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mb-3 block rounded-md bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700"
              >
                Open in Google Maps (mobile)
              </a>
              <ol className="space-y-1 text-sm">
                {plan.stops.map((s, i) => (
                  <li
                    key={s.id}
                    className="flex items-start gap-2 border-b border-slate-100 py-1.5 last:border-0"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                      {i + 1}
                    </span>
                    <div>
                      <Link
                        href={`/lead/${s.id}`}
                        className="font-medium text-violet-700 hover:underline"
                      >
                        {s.name}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {s.address ?? "—"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
            <p className="mb-1 font-semibold text-slate-600">Legend</p>
            <p>
              <span className="mr-1 inline-block h-3 w-3 rounded-full align-middle" style={{ background: "#7c3aed" }} />
              Platinum
              <span className="ml-3 mr-1 inline-block h-3 w-3 rounded-full align-middle" style={{ background: "#d97706" }} />
              Gold
              <span className="ml-3 mr-1 inline-block h-3 w-3 rounded-full align-middle" style={{ background: "#64748b" }} />
              Silver
            </p>
            <p className="mt-2">
              Pick an area to zoom in and plan a door-to-door route there.
              Route export opens directly in the Google Maps app — no API key
              needed to navigate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
