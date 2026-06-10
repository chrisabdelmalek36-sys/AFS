import { NextResponse } from "next/server";
import { targetedScan } from "@/lib/engine/zone-scan";
import { areaByKey } from "@/lib/areas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// On-demand targeted discovery: chosen categories within one chosen area.
export async function POST(req: Request) {
  let body: { areaKey?: string; categories?: string[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const area = body.areaKey ? areaByKey(body.areaKey) : undefined;
  const categories = (body.categories ?? []).filter(
    (c) => typeof c === "string",
  );
  if (!area) {
    return NextResponse.json({ error: "unknown area" }, { status: 400 });
  }
  if (categories.length === 0) {
    return NextResponse.json({ error: "pick at least one type" }, { status: 400 });
  }

  try {
    const result = await targetedScan({
      lat: area.lat,
      lng: area.lng,
      // Search a touch wider than the tight display radius so edge venues
      // aren't missed; ingest still assigns each lead to its nearest area.
      radiusKm: Math.max(area.radiusKm, 4),
      region: area.group,
      areaLabel: area.label,
      categories,
      deadline: Date.now() + 50_000,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
