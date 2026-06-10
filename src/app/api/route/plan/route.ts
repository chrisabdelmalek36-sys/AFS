import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import {
  nearestNeighbour,
  optimiseWithGoogle,
  googleMapsUrl,
  pathDistance,
  type RouteStop,
} from "@/lib/route";

export const dynamic = "force-dynamic";

// Picks leads in a geographic cluster (an area circle, a region, or
// explicit ids) and returns an optimised door-to-door order plus a
// Google Maps mobile link.
//
// - ids + keepOrder: respect the user's manual stop order exactly.
// - exclude: never pick these leads (stops the user removed).
// - shuffle: vary the picks within each tier so a re-plan gives a
//   different set of places instead of the same route again.
export async function POST(req: Request) {
  const body = (await req.json()) as {
    region?: string;
    area?: { lat: number; lng: number; radiusKm: number };
    maxStops?: number;
    ids?: number[];
    keepOrder?: boolean;
    exclude?: number[];
    shuffle?: boolean;
  };
  const max = Math.min(Math.max(body.maxStops ?? 8, 2), 23);
  const exclude = (body.exclude ?? []).filter((n) => Number.isFinite(n));
  // Within a tier, pick randomly when shuffling; freshest-first otherwise.
  const tieBreak = body.shuffle ? "random()" : "freshness DESC";

  let rows: RouteStop[];
  if (body.ids?.length) {
    rows = await q<RouteStop>(
      `SELECT id, name, lat, lng, tier, address FROM leads
        WHERE id = ANY($1) AND lat IS NOT NULL AND NOT suppressed`,
      [body.ids],
    );
    if (body.keepOrder) {
      // Preserve the caller's exact order (manual reordering).
      const pos = new Map(body.ids.map((id, i) => [Number(id), i]));
      rows.sort(
        (a, b) => (pos.get(Number(a.id)) ?? 0) - (pos.get(Number(b.id)) ?? 0),
      );
    }
  } else if (
    body.area &&
    Number.isFinite(body.area.lat) &&
    Number.isFinite(body.area.lng) &&
    Number.isFinite(body.area.radiusKm)
  ) {
    // Haversine in SQL: best New leads within the area circle.
    rows = await q<RouteStop>(
      `SELECT id, name, lat, lng, tier, address FROM leads
        WHERE lat IS NOT NULL AND NOT suppressed AND status = 'New'
          AND NOT (id = ANY($4))
          AND 2 * 6371 * asin(sqrt(
                power(sin(radians(lat - $1) / 2), 2)
                + cos(radians($1)) * cos(radians(lat))
                  * power(sin(radians(lng - $2) / 2), 2)
              )) <= $3
        ORDER BY CASE tier WHEN 'Platinum' THEN 0 WHEN 'Gold' THEN 1
                           WHEN 'Silver' THEN 2 ELSE 3 END,
                 ${tieBreak}
        LIMIT ${max}`,
      [body.area.lat, body.area.lng, body.area.radiusKm, exclude],
    );
  } else {
    // Only route leads still to approach (status='New'); contacted /
    // postponed leads are excluded so you don't re-visit them.
    rows = await q<RouteStop>(
      `SELECT id, name, lat, lng, tier, address FROM leads
        WHERE lat IS NOT NULL AND NOT suppressed AND status = 'New'
          AND NOT (id = ANY($1))
          ${body.region ? "AND region = $2" : ""}
        ORDER BY CASE tier WHEN 'Platinum' THEN 0 WHEN 'Gold' THEN 1
                           WHEN 'Silver' THEN 2 ELSE 3 END,
                 ${tieBreak}
        LIMIT ${max}`,
      body.region ? [exclude, body.region] : [exclude],
    );
  }

  if (rows.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 leads with coordinates in this cluster." },
      { status: 400 },
    );
  }

  if (body.keepOrder && body.ids?.length) {
    return NextResponse.json({
      stops: rows,
      distanceKm: pathDistance(rows),
      optimisedBy: "manual",
      googleMapsUrl: googleMapsUrl(rows),
    });
  }

  const optimised = await optimiseWithGoogle(rows);
  const { order, distanceKm } = optimised
    ? { order: optimised, distanceKm: nearestNeighbour(optimised).distanceKm }
    : nearestNeighbour(rows);

  return NextResponse.json({
    stops: order,
    distanceKm,
    optimisedBy: optimised ? "google" : "nearest-neighbour",
    googleMapsUrl: googleMapsUrl(order),
  });
}
