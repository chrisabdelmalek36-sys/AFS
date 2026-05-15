"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { MapLead } from "@/components/LeafletMap";

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

export default function MapShell({
  leads,
  regions,
}: {
  leads: MapLead[];
  regions: string[];
}) {
  const [region, setRegion] = useState("");
  const [maxStops, setMaxStops] = useState(8);
  const [plan, setPlan] = useState<{
    stops: PlannedStop[];
    distanceKm: number;
    optimisedBy: string;
    googleMapsUrl: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const shown = useMemo(
    () => (region ? leads.filter((l) => l.lat && l.lng) : leads),
    [leads, region],
  );

  async function planRoute() {
    setBusy(true);
    setErr(null);
    setPlan(null);
    try {
      const res = await fetch("/api/route/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: region || undefined, maxStops }),
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

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="h-[70vh] overflow-hidden rounded-xl border border-slate-200 bg-white">
        <LeafletMap
          leads={shown}
          route={plan?.stops.map((s) => ({ lat: s.lat, lng: s.lng })) ?? []}
        />
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-500">
            Plan a visit route
          </h2>
          <label className="mb-1 block text-xs text-slate-500">
            Cluster (region)
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="mb-3 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All Egypt (top leads)</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
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
            disabled={busy}
            className="w-full rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {busy ? "Planning…" : "Plan route"}
          </button>
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
            Route export opens directly in the Google Maps app — no API key
            needed to navigate.
          </p>
        </div>
      </div>
    </div>
  );
}
