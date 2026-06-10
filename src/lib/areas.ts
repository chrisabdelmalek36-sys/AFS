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

export const AREAS: Area[] = [
  // Greater Cairo — center & east
  { key: "zamalek",      label: "Zamalek",                 group: "Cairo",          lat: 30.0609, lng: 31.2197, radiusKm: 2.5 },
  { key: "downtown",     label: "Downtown Cairo",          group: "Cairo",          lat: 30.0444, lng: 31.2357, radiusKm: 3 },
  { key: "garden_city",  label: "Garden City",             group: "Cairo",          lat: 30.0344, lng: 31.2312, radiusKm: 2 },
  { key: "maadi",        label: "Maadi",                   group: "Cairo",          lat: 29.9602, lng: 31.2569, radiusKm: 5 },
  { key: "heliopolis",   label: "Heliopolis",              group: "Cairo",          lat: 30.0908, lng: 31.3220, radiusKm: 5 },
  { key: "nasr_city",    label: "Nasr City",               group: "Cairo",          lat: 30.0561, lng: 31.3300, radiusKm: 6 },
  { key: "new_cairo",    label: "New Cairo / 5th Settlement", group: "Cairo",       lat: 30.0080, lng: 31.4360, radiusKm: 12 },
  { key: "katameya",     label: "Katameya",                group: "Cairo",          lat: 29.9362, lng: 31.4035, radiusKm: 6 },
  { key: "rehab",        label: "El Rehab",                group: "Cairo",          lat: 30.0589, lng: 31.4913, radiusKm: 4 },
  { key: "madinaty",     label: "Madinaty",                group: "Cairo",          lat: 30.1063, lng: 31.6336, radiusKm: 5 },
  { key: "shorouk",      label: "El Shorouk",              group: "Cairo",          lat: 30.1210, lng: 31.6080, radiusKm: 6 },
  { key: "obour",        label: "El Obour",                group: "Cairo",          lat: 30.1934, lng: 31.4604, radiusKm: 6 },
  { key: "new_capital",  label: "New Administrative Capital", group: "Cairo",       lat: 30.0131, lng: 31.7400, radiusKm: 15 },

  // Giza & west
  { key: "mohandessin",  label: "Mohandessin",             group: "Giza & West",    lat: 30.0566, lng: 31.2000, radiusKm: 3 },
  { key: "dokki",        label: "Dokki",                   group: "Giza & West",    lat: 30.0383, lng: 31.2127, radiusKm: 3 },
  { key: "giza_haram",   label: "Giza / Haram",            group: "Giza & West",    lat: 29.9870, lng: 31.1313, radiusKm: 6 },
  { key: "sheikh_zayed", label: "Sheikh Zayed",            group: "Giza & West",    lat: 30.0420, lng: 30.9760, radiusKm: 8 },
  { key: "october",      label: "6th of October",          group: "Giza & West",    lat: 29.9285, lng: 30.9188, radiusKm: 12 },

  // Alexandria & North Coast
  { key: "alexandria",   label: "Alexandria",              group: "Alex & North Coast", lat: 31.2001, lng: 29.9187, radiusKm: 15 },
  { key: "sahel",        label: "North Coast (Sahel)",     group: "Alex & North Coast", lat: 30.9700, lng: 28.9300, radiusKm: 40 },
  { key: "marina",       label: "Marina El Alamein",       group: "Alex & North Coast", lat: 30.8230, lng: 28.9580, radiusKm: 8 },
  { key: "new_alamein",  label: "New Alamein",             group: "Alex & North Coast", lat: 30.8270, lng: 28.9530, radiusKm: 10 },
  { key: "ras_el_hekma", label: "Ras El Hekma",            group: "Alex & North Coast", lat: 31.1300, lng: 27.8000, radiusKm: 15 },

  // Red Sea
  { key: "ain_sokhna",   label: "Ain Sokhna",              group: "Red Sea",        lat: 29.6010, lng: 32.3170, radiusKm: 15 },
  { key: "el_gouna",     label: "El Gouna",                group: "Red Sea",        lat: 27.3940, lng: 33.6780, radiusKm: 8 },
  { key: "hurghada",     label: "Hurghada",                group: "Red Sea",        lat: 27.2579, lng: 33.8116, radiusKm: 12 },
  { key: "sahl_hasheesh",label: "Sahl Hasheesh",           group: "Red Sea",        lat: 27.0540, lng: 33.8920, radiusKm: 8 },
  { key: "soma_bay",     label: "Soma Bay",                group: "Red Sea",        lat: 26.8430, lng: 33.9930, radiusKm: 7 },

  // Sinai
  { key: "sharm",        label: "Sharm El Sheikh",         group: "Sinai",          lat: 27.9158, lng: 34.3300, radiusKm: 15 },
  { key: "dahab",        label: "Dahab",                   group: "Sinai",          lat: 28.5091, lng: 34.5136, radiusKm: 7 },

  // Upper Egypt
  { key: "luxor",        label: "Luxor",                   group: "Upper Egypt",    lat: 25.6872, lng: 32.6396, radiusKm: 10 },
  { key: "aswan",        label: "Aswan",                   group: "Upper Egypt",    lat: 24.0889, lng: 32.8998, radiusKm: 10 },
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

// Sensible Leaflet zoom for an area of the given radius.
export function areaZoom(radiusKm: number): number {
  if (radiusKm <= 3) return 14;
  if (radiusKm <= 6) return 13;
  if (radiusKm <= 10) return 12;
  if (radiusKm <= 18) return 11;
  if (radiusKm <= 30) return 10;
  return 9;
}
