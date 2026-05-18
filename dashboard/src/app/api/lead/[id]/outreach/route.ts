import { NextResponse } from "next/server";
import { getLead } from "@/lib/leads";
import { generateOutreach } from "@/lib/outreach";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  const lead = await getLead(id);
  if (!lead)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  const result = await generateOutreach(lead);
  return NextResponse.json(result);
}
