import { NextResponse } from "next/server";
import { quickRefresh } from "@/lib/engine/quick-refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily Vercel Cron hits this endpoint at 04:00 UTC (~ early Cairo).
// Vercel automatically signs requests with the CRON_SECRET env var.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  // Vercel sends "Bearer <CRON_SECRET>". Allow either header form.
  if (secret && auth !== `Bearer ${secret}` && req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await quickRefresh();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}

// Also allow manual POST trigger from any client with the secret.
export const POST = GET;
