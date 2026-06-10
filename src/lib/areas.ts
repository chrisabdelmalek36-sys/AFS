// Egypt's key commercial areas for the map: quick navigation, pin filtering
// and route planning. radiusKm defines what counts as "inside" the area.

export interface Area {
  key: string;
  label: string;
  group: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

// Radii are deliberately tight so neighbouring areas barely overlap — a given
// business should fall inside at most one area. (Pair this with nearestArea()
// below, which assigns each lead to a single area even if circles graze.)
export const AREAS: Area[] = [
  // Greater Cairo — center & east
  { key: "zamalek",      label: "Zamalek",                 group: "Cairo",          lat: 30.0609, lng: 31.2197, radiusKm: 1.5 },
  { key: "downtown",     label: "Downtown Cairo",          group: "Cairo",          lat: 30.0444, lng: 31.2357, radiusKm: 1.8 },
  { key: "garden_city",  label: "Garden City",             group: "Cairo",          lat: 30.0344, lng: 31.2312, radiusKm: 1.2 },
  { key: "maadi",        label: "Maadi",                   group: "Cairo",          lat: 29.9602, lng: 31.2569, radiusKm: 3 },
  { key: "heliopolis",   label: "Heliopolis",              group: "Cairo",          lat: 30.0908, lng: 31.3220, radiusKm: 3.5 },
  { key: "nasr_city",    label: "Nasr City",               group: "Cairo",          lat: 30.0561, lng: 31.3300, radiusKm: 3.5 },
  { key: "new_cairo",    label: "New Cairo / 5th Settlement", group: "Cairo",       lat: 30.0080, lng: 31.4360, radiusKm: 7 },
  { key: "katameya",     label: "Katameya",                group: "Cairo",          lat: 29.9362, lng: 31.4035, radiusKm: 4 },
  { key: "rehab",        label: "El Rehab",                group: "Cairo",          lat: 30.0589, lng: 31.4913, radiusKm: 3 },
  { key: "madinaty",     label: "Madinaty",                group: "Cairo",          lat: 30.1063, lng: 31.6336, radiusKm: 4 },
  { key: "shorouk",      label: "El Shorouk",              group: "Cairo",          lat: 30.1210, lng: 31.6080, radiusKm: 4 },
  { key: "obour",        label: "El Obour",                group: "Cairo",          lat: 30.1934, lng: 31.4604, radiusKm: 4 },
  { key: "new_capital",  label: "New Administrative Capital", group: "Cairo",       lat: 30.0131, lng: 31.7400, radiusKm: 9 },

  // Giza & west
  { key: "mohandessin",  label: "Mohandessin",             group: "Giza & West",    lat: 30.0566, lng: 31.2000, radiusKm: 1.6 },
  { key: "dokki",        label: "Dokki",                   group: "Giza & West",    lat: 30.0383, lng: 31.2127, radiusKm: 1.6 },
  { key: "giza_haram",   label: "Giza / Haram",            group: "Giza & West",    lat: 29.9870, lng: 31.1313, radiusKm: 4 },
  { key: "sheikh_zayed", label: "Sheikh Zayed",            group: "Giza & West",    lat: 30.0420, lng: 30.9760, radiusKm: 5 },
  { key: "october",      label: "6th of October",          group: "Giza & West",    lat: 29.9285, lng: 30.9188, radiusKm: 7 },

  // Alexandria & North Coast
  { key: "alexandria",   label: "Alexandria",              group: "Alex & North Coast", lat: 31.2001, lng: 29.9187, radiusKm: 10 },
  { key: "sahel",        label: "North Coast (Sahel)",     group: "Alex & North Coast", lat: 30.9700, lng: 28.9300, radiusKm: 22 },
  { key: "marina",       label: "Marina El Alamein",       group: "Alex & North Coast", lat: 30.8230, lng: 28.9580, radiusKm: 5 },
  { key: "new_alamein",  label: "New Alamein",             group: "Alex & North Coast", lat: 30.8270, lng: 28.9530, radiusKm: 6 },
  { key: "ras_el_hekma", label: "Ras El Hekma",            group: "Alex & North Coast", lat: 31.1300, lng: 27.8000, radiusKm: 10 },

  // Red Sea
  { key: "ain_sokhna",   label: "Ain Sokhna",              group: "Red Sea",        lat: 29.6010, lng: 32.3170, radiusKm: 10 },
  { key: "el_gouna",     label: "El Gouna",                group: "Red Sea",        lat: 27.3940, lng: 33.6780, radiusKm: 5 },
  { key: "hurghada",     label: "Hurghada",                group: "Red Sea",        lat: 27.2579, lng: 33.8116, radiusKm: 8 },
  { key: "sahl_hasheesh",label: "Sahl Hasheesh",           group: "Red Sea",        lat: 27.0540, lng: 33.8920, radiusKm: 5 },
  { key: "soma_bay",     label: "Soma Bay",                group: "Red Sea",        lat: 26.8430, lng: 33.9930, radiusKm: 5 },

  // Sinai
  { key: "sharm",        label: "Sharm El Sheikh",         group: "Sinai",          lat: 27.9158, lng: 34.3300, radiusKm: 10 },
  { key: "dahab",        label: "Dahab",                   group: "Sinai",          lat: 28.5091, lng: 34.5136, radiusKm: 5 },

  // Upper Egypt
  { key: "luxor",        label: "Luxor",                   group: "Upper Egypt",    lat: 25.6872, lng: 32.6396, radiusKm: 7 },
  { key: "aswan",        label: "Aswan",                   group: "Upper Egypt",    lat: 24.0889, lng: 32.8998, radiusKm: 7 },
];

export const AREA_GROUPS = [...new Set(AREAS.map((a) => a.group))];

export function areaByKey(key: string): Area | undefined {
  return AREAS.find((a) => a.key === key);
}

export function haversineKm(
  aLat: number, aLng: number, bLat: number, bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function inArea(area: Area, lat: number, lng: number): boolean {
  return haversineKm(area.lat, area.lng, lat, lng) <= area.radiusKm;
}

// The single area a point belongs to: the nearest one whose circle contains
// it. Returns null when the point is outside every area. This guarantees a
// business is counted in at most one area, even if two circles overlap.
export function nearestArea(lat: number, lng: number): Area | null {
  let best: Area | null = null;
  let bestD = Infinity;
  for (const a of AREAS) {
    const d = haversineKm(a.lat, a.lng, lat, lng);
    if (d <= a.radiusKm && d < bestD) {
      best = a;
      bestD = d;
    }
  }
  return best;
}

// Sensible Leaflet zoom for an area of the given radius.
export function areaZoom(radiusKm: number): number {
  if (radiusKm <= 3) return 14;
  if (radiusKm <= 6) return 13;
  if (radiusKm <= 10) return 12;
  if (radiusKm <= 18) return 11;
  if (radiusKm <= 30) return 10;
  return 9;
}

// A focus (center + zoom) that frames several areas at once.
export function multiAreaFocus(
  keys: string[],
): { lat: number; lng: number; zoom: number } | null {
  const picked = keys.map(areaByKey).filter((a): a is Area => !!a);
  if (picked.length === 0) return null;
  if (picked.length === 1) {
    return { lat: picked[0]!.lat, lng: picked[0]!.lng, zoom: areaZoom(picked[0]!.radiusKm) };
  }
  const lats = picked.map((a) => a.lat);
  const lngs = picked.map((a) => a.lng);
  const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  // Rough span (km) across the selection → zoom.
  const span = haversineKm(
    Math.min(...lats), Math.min(...lngs),
    Math.max(...lats), Math.max(...lngs),
  );
  const zoom =
    span > 400 ? 6 : span > 200 ? 7 : span > 100 ? 8 : span > 50 ? 9 : span > 25 ? 10 : 11;
  return { lat, lng, zoom };
}
