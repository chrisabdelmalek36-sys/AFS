"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Drives the chunked OSM scan from the browser: keeps calling /api/scan
// (each call covers what fits in one serverless invocation) until a full
// pass over Egypt completes. This is how a ~15-minute scan runs on a host
// with a 60-second function limit — the browser is the loop.

const MAX_STEPS = 60; // hard stop ≈ 45 min, in case Overpass crawls

type Phase = "idle" | "running" | "done" | "error";

export default function ScanButton() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [zone, setZone] = useState("");
  const [pct, setPct] = useState(0);
  const [found, setFound] = useState(0);

  async function run() {
    setPhase("running");
    setFound(0);
    setPct(0);
    try {
      let total = 0;
      for (let i = 0; i < MAX_STEPS; i++) {
        const r = await fetch("/api/scan", { method: "POST" });
        if (!r.ok) throw new Error(`scan step failed (${r.status})`);
        const j: {
          zoneLabel: string;
          inserted: number;
          done: boolean;
          progressPct: number;
        } = await r.json();
        total += j.inserted;
        setZone(j.zoneLabel);
        setPct(j.progressPct);
        setFound(total);
        router.refresh(); // new leads appear live as each chunk lands
        if (j.done) break;
      }
      setPhase("done");
    } catch {
      setPhase("error");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={phase === "running"}
        className="rounded-md bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {phase === "running" ? "Scanning…" : "Find real leads"}
      </button>
      {phase === "running" && (
        <span className="text-xs text-slate-500">
          {pct}% · {zone} · {found} new lead{found === 1 ? "" : "s"} so far
        </span>
      )}
      {phase === "done" && (
        <span className="text-xs font-medium text-green-600">
          Scan complete — {found} new lead{found === 1 ? "" : "s"} added
        </span>
      )}
      {phase === "error" && (
        <span className="text-xs font-medium text-rose-600">
          Scan hit an error — progress is saved, click to continue
        </span>
      )}
    </div>
  );
}
