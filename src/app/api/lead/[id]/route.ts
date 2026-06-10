import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

// Permanently deletes a lead. Its dedup hash is remembered in deleted_leads
// so future scans never re-import the same business. FKs cascade (messages,
// history, sources).
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  try {
    await q(
      `INSERT INTO deleted_leads (dedup_hash, name)
       SELECT dedup_hash, name FROM leads WHERE id=$1
       ON CONFLICT (dedup_hash) DO NOTHING`,
      [id],
    );
    const r = await q<{ id: number }>(
      `DELETE FROM leads WHERE id=$1 RETURNING id`,
      [id],
    );
    if (r.length === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
