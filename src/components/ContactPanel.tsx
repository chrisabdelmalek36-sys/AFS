"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  linkedinPeopleSearch,
  linkedinCompanySearch,
  linkedinUsername,
} from "@/lib/linkedin";

// Full contact editor on the lead detail page: decision-maker name, title,
// LinkedIn profile and a verified toggle, plus one-click LinkedIn searches to
// go find the person. Saves all fields together.

export default function ContactPanel({
  id,
  companyName,
  city,
  contactPerson,
  contactTitle,
  linkedinUrl,
  verified,
}: {
  id: number;
  companyName: string;
  city: string | null;
  contactPerson: string | null;
  contactTitle: string | null;
  linkedinUrl: string | null;
  verified: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(contactPerson ?? "");
  const [title, setTitle] = useState(contactTitle ?? "");
  const [li, setLi] = useState(linkedinUrl ?? "");
  const [isVerified, setVerified] = useState(verified);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  async function save() {
    setState("saving");
    await fetch(`/api/lead/${id}/contact`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact_person: name,
        contact_title: title,
        linkedin_url: li,
        contact_verified: isVerified,
      }),
    });
    setState("saved");
    router.refresh();
    setTimeout(() => setState("idle"), 1500);
  }

  const handle = linkedinUsername(li);
  const field =
    "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm";

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Decision-maker</span>
        <button
          onClick={() => setVerified((v) => !v)}
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isVerified
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {isVerified ? "✓ Verified" : "Unverified"}
        </button>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs text-slate-500">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Karim Hassan"
          className={field}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-slate-500">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Procurement Manager"
          className={field}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-slate-500">
          LinkedIn profile URL
        </span>
        <input
          value={li}
          onChange={(e) => setLi(e.target.value)}
          placeholder="https://www.linkedin.com/in/…"
          className={field}
        />
      </label>

      {li && (
        <a
          href={li}
          target="_blank"
          rel="noreferrer"
          className="inline-block font-medium text-[#0a66c2] hover:underline"
        >
          in/{handle ?? "profile"} ↗
        </a>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={save}
          disabled={state === "saving"}
          className="rounded-md bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {state === "saving" ? "Saving…" : "Save contact"}
        </button>
        {state === "saved" && (
          <span className="text-xs font-medium text-emerald-600">Saved ✓</span>
        )}
      </div>

      <div className="border-t border-slate-100 pt-3 text-xs">
        <p className="mb-1 text-slate-500">Find the decision-maker (free):</p>
        <div className="flex flex-wrap gap-3">
          <a
            href={linkedinPeopleSearch(companyName, city)}
            target="_blank"
            rel="noreferrer"
            className="text-[#0a66c2] hover:underline"
          >
            ↗ People at {companyName}
          </a>
          <a
            href={linkedinCompanySearch(companyName)}
            target="_blank"
            rel="noreferrer"
            className="text-[#0a66c2] hover:underline"
          >
            ↗ Company page
          </a>
        </div>
        <p className="mt-2 text-slate-400">
          Search on LinkedIn, then paste the profile URL above and mark it
          verified.
        </p>
      </div>
    </div>
  );
}
