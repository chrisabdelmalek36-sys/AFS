import { NextResponse } from "next/server";
import { targetedScan } from "@/lib/engine/zone-scan";
import { areaByKey } from "@/lib/areas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// On-demand targeted discovery: chosen categories (+ free-text types) across
// one or more chosen areas.
export async function POST(req: Request) {
  let body: { areaKeys?: string[]; categories?: string[]; custom?: string[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const areas = (body.areaKeys ?? [])
    .map((k) => areaByKey(k))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => ({
      key: a.key,
      label: a.label,
      group: a.group,
      lat: a.lat,
      lng: a.lng,
      radiusKm: a.radiusKm,
    }));
  const categories = (body.categories ?? []).filter((c) => typeof c === "string");
  const custom = (body.custom ?? []).filter((c) => typeof c === "string");

  if (areas.length === 0) {
    return NextResponse.json({ error: "pick at least one area" }, { status: 400 });
  }
  if (categories.length === 0 && custom.length === 0) {
    return NextResponse.json({ error: "pick at least one type" }, { status: 400 });
  }
  // Bound the work so one call stays inside the 60s ceiling.
  if (areas.length * (categories.length + custom.length) > 220) {
    return NextResponse.json(
      { error: "Too many areas × types at once — narrow the selection a little." },
      { status: 400 },
    );
  }

  try {
    const result = await targetedScan({
      areas,
      categories,
      custom,
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
