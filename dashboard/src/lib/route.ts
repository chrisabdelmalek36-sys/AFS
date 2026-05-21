export interface RouteStop {
  id: number;
  name: string;
  lat: number;
  lng: number;
  tier: string | null;
  address: string | null;
}

function haversineKm(a: RouteStop, b: RouteStop): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Nearest-neighbour ordering from the first stop. Good enough for a
// door-to-door day route and needs no API key.
export function nearestNeighbour(stops: RouteStop[]): {
  order: RouteStop[];
  distanceKm: number;
} {
  if (stops.length <= 2)
    return { order: stops, distanceKm: stops.length === 2 ? haversineKm(stops[0]!, stops[1]!) : 0 };
  const remaining = [...stops];
  const order: RouteStop[] = [remaining.shift()!];
  let dist = 0;
  while (remaining.length) {
    const last = order[order.length - 1]!;
    let bi = 0;
    let bd = Infinity;
    remaining.forEach((s, i) => {
      const d = haversineKm(last, s);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    dist += bd;
    order.push(remaining.splice(bi, 1)[0]!);
  }
  return { order, distanceKm: Math.round(dist * 10) / 10 };
}

// A Google Maps directions URL that opens directly in the mobile app —
// no API key needed to navigate.
export function googleMapsUrl(order: RouteStop[]): string {
  if (order.length === 0) return "https://www.google.com/maps";
  const pt = (s: RouteStop) => `${s.lat},${s.lng}`;
  const origin = pt(order[0]!);
  const destination = pt(order[order.length - 1]!);
  const mid = order.slice(1, -1).map(pt).join("|");
  const u = new URL("https://www.google.com/maps/dir/");
  u.searchParams.set("api", "1");
  u.searchParams.set("origin", origin);
  u.searchParams.set("destination", destination);
  if (mid) u.searchParams.set("waypoints", mid);
  u.searchParams.set("travelmode", "driving");
  return u.toString();
}

// Optional upgrade: if a Google key is configured, ask the Directions
// API for an optimised waypoint order. Falls back silently.
export async function optimiseWithGoogle(
  stops: RouteStop[],
): Promise<RouteStop[] | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || stops.length < 3) return null;
  try {
    const origin = `${stops[0]!.lat},${stops[0]!.lng}`;
    const dest = `${stops[stops.length - 1]!.lat},${stops[stops.length - 1]!.lng}`;
    const wp =
      "optimize:true|" +
      stops.slice(1, -1).map((s) => `${s.lat},${s.lng}`).join("|");
    const url =
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}` +
      `&destination=${dest}&waypoints=${encodeURIComponent(wp)}&key=${key}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = (await r.json()) as {
      routes?: { waypoint_order?: number[] }[];
    };
    const ord = j.routes?.[0]?.waypoint_order;
    if (!ord) return null;
    const middle = stops.slice(1, -1);
    return [
      stops[0]!,
      ...ord.map((i) => middle[i]!),
      stops[stops.length - 1]!,
    ];
  } catch {
    return null;
  }
}
