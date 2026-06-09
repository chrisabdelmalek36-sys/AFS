import { NextResponse } from "next/server";
import { scanStep } from "@/lib/engine/zone-scan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// One resumable chunk of the free OSM lead scan. The dashboard button calls
// this repeatedly until { done: true }, which is how a ~15-minute full-Egypt
// scan runs on a platform with a 60s function ceiling.
export async function POST() {
  try {
    const result = await scanStep(Date.now() + 45_000);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
