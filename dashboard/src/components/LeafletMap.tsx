"use client";

import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
} from "react-leaflet";
import Link from "next/link";
import { TIER_COLORS } from "@/components/ui";

export interface MapLead {
  id: number;
  name: string;
  lat: number;
  lng: number;
  tier: string | null;
  status: string;
  category: string | null;
}

export default function LeafletMap({
  leads,
  route,
}: {
  leads: MapLead[];
  route: { lat: number; lng: number }[];
}) {
  const center: [number, number] =
    leads.length > 0 ? [leads[0]!.lat, leads[0]!.lng] : [27.5, 31.0];

  return (
    <MapContainer
      center={center}
      zoom={leads.length > 0 ? 6 : 6}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {leads.map((l) => (
        <CircleMarker
          key={l.id}
          center={[l.lat, l.lng]}
          radius={9}
          pathOptions={{
            color: "#fff",
            weight: 2,
            fillColor: TIER_COLORS[l.tier ?? "Unrated"] ?? "#94a3b8",
            fillOpacity: 0.9,
          }}
        >
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{l.name}</p>
              <p className="text-xs text-slate-500">
                {l.tier ?? "Unrated"} · {l.category ?? "—"} · {l.status}
              </p>
              <Link
                href={`/lead/${l.id}`}
                className="text-xs font-medium text-violet-700 underline"
              >
                Open lead →
              </Link>
            </div>
          </Popup>
        </CircleMarker>
      ))}
      {route.length >= 2 && (
        <Polyline
          positions={route.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: "#7c3aed", weight: 4, opacity: 0.8 }}
        />
      )}
    </MapContainer>
  );
}
