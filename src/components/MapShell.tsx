"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MapLead, MapFocus } from "@/components/LeafletMap";
import {
  AREAS,
  AREA_GROUPS,
  areaByKey,
  areaZoom,
  nearestArea,
  multiAreaFocus,
  haversineKm,
} from "@/lib/areas";

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
  initialAreaKey = "",
  initialAreaKeys = "",
  initialIds = "",
}: {
  leads: MapLead[];
  initialAreaKey?: string;
  initialAreaKeys?: string;
  initialIds?: string;
}) {
  const router = useRouter();
  // A specific search result (/map?ids=…): show ONLY these leads.
  const [idFilter, setIdFilter] = useState<number[]>(
    initialIds
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0),
  );
  const idSet = useMemo(() => new Set(idFilter), [idFilter]);
  const idsActive = idFilter.length > 0;
  // A multi-area selection from a "Find leads" search (/map?areas=a,b,c).
  const seedMulti = initialAreaKeys
    .split(",")
    .map((k) => k.trim())
    .filter((k) => !!areaByKey(k));
  const [multiKeys, setMultiKeys] = useState<string[]>(
    seedMulti.length > 1 ? seedMulti : [],
  );
  // Seeded from /map?area=… (single area) or a 1-area search.
  const seedSingle =
    areaByKey(initialAreaKey)?.key ?? (seedMulti.length === 1 ? seedMulti[0] : "");
  const [areaKey, setAreaKey] = useState(seedSingle ?? "");
  const [maxStops, setMaxStops] = useState(8);
  const [plan, setPlan] = useState<{
    stops: PlannedStop[];
    distanceKm: number;
    optimisedBy: string;
    googleMapsUrl: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Stops the user kicked off a route — never offered again this session.
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  // Once the user reorders manually, edits stop re-optimising the order.
  const [manualOrder, setManualOrder] = useState(false);

  const area = areaKey ? areaByKey(areaKey) : undefined;
  const multiSet = useMemo(() => new Set(multiKeys), [multiKeys]);
  const multiActive = multiKeys.length > 1;

  // Each lead is assigned to exactly one area (its nearest), so the same
  // business never shows up under two different areas.
  const areaOf = useMemo(() => {
    const m = new Map<number, string>();
    for (const l of leads) {
      const a = nearestArea(l.lat, l.lng);
      if (a) m.set(l.id, a.key);
    }
    return m;
  }, [leads]);

  // Leads to show: a specific id result, a multi-area set, a single area,
  // or everything.
  const shown = useMemo(() => {
    if (idsActive) return leads.filter((l) => idSet.has(l.id));
    if (multiActive) {
      return leads.filter((l) => {
        const k = areaOf.get(l.id);
        return k != null && multiSet.has(k);
      });
    }
    return area ? leads.filter((l) => areaOf.get(l.id) === area.key) : leads;
  }, [leads, area, areaOf, multiActive, multiSet, idsActive, idSet]);

  // Live lead count per area, so the picker doubles as a heat list.
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const key of areaOf.values()) m.set(key, (m.get(key) ?? 0) + 1);
    return m;
  }, [areaOf]);

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

  // Frame a set of leads (centroid + zoom from their spread).
  const fitFocus = (pts: { lat: number; lng: number }[]): MapFocus | null => {
    if (pts.length === 0) return null;
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    if (pts.length === 1) return { lat, lng, zoom: 14 };
    const span = haversineKm(Math.min(...lats), Math.min(...lngs), Math.max(...lats), Math.max(...lngs));
    const zoom =
      span > 400 ? 6 : span > 200 ? 7 : span > 100 ? 8 : span > 50 ? 9 : span > 20 ? 10 : span > 8 ? 11 : 13;
    return { lat, lng, zoom };
  };

  const focus: MapFocus | null = idsActive
    ? fitFocus(shown)
    : multiActive
      ? multiAreaFocus(multiKeys)
      : area
        ? {
            lat: area.lat,
            lng: area.lng,
            zoom: areaZoom(area.radiusKm),
            radiusKm: area.radiusKm,
          }
        : null;

  // API ids may arrive as strings (bigint) — normalise once on receipt so
  // every later comparison is number === number.
  type PlanData = {
    stops: PlannedStop[];
    distanceKm: number;
    optimisedBy: string;
    googleMapsUrl: string;
  };
  const normalisePlan = (d: PlanData): PlanData => ({
    ...d,
    stops: d.stops.map((s) => ({ ...s, id: Number(s.id) })),
  });

  // Fresh plan, scoped to what's on screen: a search result (ids), a
  // multi-area view, one area, or all Egypt. Removed stops are always
  // excluded; when a route already exists its stops are excluded too and
  // picks are shuffled, so re-planning gives DIFFERENT places.
  async function planRoute() {
    const excludeNow = plan
      ? [...removedIds, ...plan.stops.map((s) => Number(s.id))]
      : removedIds;
    setBusy(true);
    setErr(null);
    setManualOrder(false);
    try {
      let payload: Record<string, unknown>;
      if (idsActive || multiActive) {
        // Route the leads currently in view (best-first order from the
        // server), skipping removed/excluded ones.
        const ids = shown
          .map((l) => Number(l.id))
          .filter((x) => !excludeNow.includes(x))
          .slice(0, maxStops);
        payload = { ids };
      } else {
        payload = {
          area: area
            ? { lat: area.lat, lng: area.lng, radiusKm: area.radiusKm }
            : undefined,
          maxStops,
          exclude: excludeNow,
          shuffle: plan != null,
        };
      }
      const res = await fetch("/api/route/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to plan route");
      setPlan(normalisePlan(data));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  // Re-plan from an explicit set of lead ids — used when editing the route.
  // keepOrder preserves the given order (manual reordering); otherwise the
  // optimiser re-orders.
  async function replan(ids: number[], keepOrder: boolean) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/route/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, keepOrder }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update route");
      setPlan(normalisePlan(data));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const stopIds = plan?.stops.map((s) => Number(s.id)) ?? [];

  // "Remove for now": off this route + not suggested again this session.
  function removeStop(id: number) {
    setRemovedIds((r) => [...r, id]);
    replan(stopIds.filter((x) => x !== id), manualOrder);
  }
  // "Remove from the map completely": deletes the lead for good (the engine
  // remembers it, so scans won't re-import it), then re-plans without it.
  async function deleteStop(id: number, name: string) {
    if (
      !window.confirm(
        `Delete "${name}" from the map completely?\n\nThis removes the lead everywhere (Leads, Database, Map) and it will NOT come back in future scans.`,
      )
    )
      return;
    setBusy(true);
    try {
      const r = await fetch(`/api/lead/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      setRemovedIds((p) => [...p, id]);
      setIdFilter((f) => f.filter((x) => x !== id));
      router.refresh(); // pin disappears from the map data
      const rest = stopIds.filter((x) => x !== id);
      if (rest.length >= 2) await replan(rest, manualOrder);
      else setPlan(null);
    } catch {
      setErr("Delete failed — try again.");
    } finally {
      setBusy(false);
    }
  }
  function addStop(id: number) {
    if (id && !stopIds.includes(id)) replan([...stopIds, id], manualOrder);
  }
  // Move a stop to a new 1-based position (e.g. make it first or last).
  function moveStop(id: number, newPos: number) {
    const rest = stopIds.filter((x) => x !== id);
    rest.splice(newPos - 1, 0, id);
    setManualOrder(true);
    replan(rest, true);
  }
  // Other leads in view that aren't already on the route — candidates to add.
  const candidates = shown.filter(
    (l) => !stopIds.includes(l.id) && !removedIds.includes(l.id),
  );

  function selectArea(key: string) {
    setAreaKey(key);
    setMultiKeys([]); // leaving the multi-area search view
    setIdFilter([]); // leaving the search-result view
    setPlan(null);
    setErr(null);
  }

  return (
    <div className="space-y-3">
      {idsActive && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm">
          <span className="text-emerald-800">
            Showing <b>{shown.length}</b> lead{shown.length === 1 ? "" : "s"} from
            your search.
          </span>
          <button
            onClick={() => selectArea("")}
            className="rounded-md border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            Show all Egypt
          </button>
        </div>
      )}
      {multiActive && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm">
          <span className="text-violet-800">
            Showing <b>{shown.length}</b> lead{shown.length === 1 ? "" : "s"} across{" "}
            <b>{multiKeys.length}</b> areas from your search.
          </span>
          <button
            onClick={() => selectArea("")}
            className="rounded-md border border-violet-300 bg-white px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100"
          >
            Show all Egypt
          </button>
        </div>
      )}

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
              disabled={
                busy ||
                ((area != null || idsActive || multiActive) && shown.length < 2)
              }
              className="w-full rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {busy
                ? "Planning…"
                : idsActive || multiActive
                  ? `Plan route from these ${shown.length} results`
                  : plan
                    ? `New route (other places)${area ? ` in ${area.label}` : ""}`
                    : `Plan route${area ? ` in ${area.label}` : ""}`}
            </button>
            {(area != null || idsActive || multiActive) && shown.length < 2 && (
              <p className="mt-2 text-xs text-slate-500">
                Need at least 2 leads in view to plan a route.
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
                    <select
                      value={i + 1}
                      disabled={busy}
                      title="Change this stop's position (1 = first)"
                      onChange={(e) => moveStop(Number(s.id), Number(e.target.value))}
                      className="mt-0.5 shrink-0 cursor-pointer rounded-full border border-violet-200 bg-violet-50 px-1 py-0.5 text-xs font-bold text-violet-700"
                    >
                      {plan.stops.map((_, n) => (
                        <option key={n} value={n + 1}>
                          {n + 1}
                        </option>
                      ))}
                    </select>
                    <div className="min-w-0 grow">
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
                    <span className="mt-0.5 flex shrink-0 items-center">
                      <button
                        onClick={() => removeStop(Number(s.id))}
                        disabled={busy || plan.stops.length <= 2}
                        title={
                          plan.stops.length <= 2
                            ? "A route needs at least 2 stops"
                            : "Remove from this route only (stays on the map)"
                        }
                        className="rounded px-1.5 text-xs text-slate-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40"
                      >
                        ✕
                      </button>
                      <button
                        onClick={() => deleteStop(Number(s.id), s.name)}
                        disabled={busy}
                        title="Delete from the map completely (never comes back)"
                        className="rounded px-1.5 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                      >
                        🗑
                      </button>
                    </span>
                  </li>
                ))}
              </ol>

              {/* Add / replace a stop with another lead in view */}
              <div className="mt-3 border-t border-slate-100 pt-3">
                <label className="mb-1 block text-xs text-slate-500">
                  Add a stop {area ? `from ${area.label}` : ""}
                </label>
                <select
                  value=""
                  disabled={busy || candidates.length === 0}
                  onChange={(e) => {
                    if (e.target.value) addStop(Number(e.target.value));
                  }}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:opacity-50"
                >
                  <option value="">
                    {candidates.length === 0 ? "No other leads in view" : "+ Add a lead to the route…"}
                  </option>
                  {candidates.slice(0, 200).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  ✕ removes a stop from this route only · 🗑 deletes it from the
                  map forever. Change a stop&apos;s number to make it
                  first/last. &quot;New route&quot; picks different places
                  entirely.
                </p>
              </div>
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
