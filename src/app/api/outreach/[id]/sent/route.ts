import { NextResponse } from "next/server";
import { markWhatsappSent } from "@/lib/leads";

export const dynamic = "force-dynamic";

// Marks a WhatsApp sequence step as sent — called right after the user taps
// the pre-filled wa.me link from the lead page or the daily follow-up list.
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  try {
    const ok = await markWhatsappSent(id);
    return NextResponse.json({ ok });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
