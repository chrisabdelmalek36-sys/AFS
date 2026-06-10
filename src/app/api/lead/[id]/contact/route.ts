import { NextResponse } from "next/server";
import { updateLeadContact, type ContactPatch } from "@/lib/leads";

export const dynamic = "force-dynamic";

// Saves inline edits to a lead's contact person / LinkedIn / verified flag.
// Used by the editable cells on the Leads table and the lead detail page.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  let body: ContactPatch;
  try {
    body = (await req.json()) as ContactPatch;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  // Whitelist the editable fields; ignore anything else a client might send.
  const patch: ContactPatch = {};
  if ("contact_person" in body) patch.contact_person = body.contact_person;
  if ("contact_title" in body) patch.contact_title = body.contact_title;
  if ("linkedin_url" in body) patch.linkedin_url = body.linkedin_url;
  if ("contact_verified" in body) patch.contact_verified = body.contact_verified;
  if ("priority" in body) patch.priority = body.priority;
  if ("notes" in body) patch.notes = body.notes;
  if ("email" in body) patch.email = body.email;
  if ("email_status" in body) patch.email_status = body.email_status;
  if ("status" in body) patch.status = body.status;

  try {
    await updateLeadContact(id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
