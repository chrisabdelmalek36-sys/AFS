import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import {
  nearestNeighbour,
  optimiseWithGoogle,
  googleMapsUrl,
  type RouteStop,
} from "@/lib/route";

export const dynamic = "force-dynamic";

// Picks leads in a geographic cluster (a region) and returns an
// optimised door-to-door order plus a Google Maps mobile link.
export async function POST(req: Request) {
  const body = (await req.json()) as {
    region?: string;
    maxStops?: number;
    ids?: number[];
  };
  const max = Math.min(Math.max(body.maxStops ?? 8, 2), 23);

  const rows = body.ids?.length
    ? await q<RouteStop>(
        `SELECT id, name, lat, lng, tier, address FROM leads
          WHERE id = ANY($1) AND lat IS NOT NULL AND NOT suppressed`,
        [body.ids],
      )
    : await q<RouteStop>(
        `SELECT id, name, lat, lng, tier, address FROM leads
          WHERE lat IS NOT NULL AND NOT suppressed
            ${body.region ? "AND region = $1" : ""}
          ORDER BY CASE tier WHEN 'Platinum' THEN 0 WHEN 'Gold' THEN 1
                             WHEN 'Silver' THEN 2 ELSE 3 END,
                   freshness DESC
          LIMIT ${max}`,
        body.region ? [body.region] : [],
      );

  if (rows.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 leads with coordinates in this cluster." },
      { status: 400 },
    );
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
