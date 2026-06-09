"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { linkedinPeopleSearch, linkedinUsername } from "@/lib/linkedin";

// Notion-style inline contact cell for the Leads table. Click the name to
// edit it; click the LinkedIn area to paste a profile URL; toggle the green
// check to mark the contact verified. Every change PATCHes immediately.

export default function ContactCell({
  id,
  companyName,
  city,
  contactPerson,
  linkedinUrl,
  verified,
}: {
  id: number;
  companyName: string;
  city: string | null;
  contactPerson: string | null;
  linkedinUrl: string | null;
  verified: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(contactPerson ?? "");
  const [li, setLi] = useState(linkedinUrl ?? "");
  const [isVerified, setVerified] = useState(verified);
  const [editName, setEditName] = useState(false);
  const [editLi, setEditLi] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    try {
      await fetch(`/api/lead/${id}/contact`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const handle = linkedinUsername(li);

  return (
    <div className="min-w-[200px] space-y-1">
      {/* Contact name */}
      <div className="flex items-center gap-1.5">
        {editName ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setEditName(false);
              if (name !== (contactPerson ?? "")) save({ contact_person: name });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setName(contactPerson ?? "");
                setEditName(false);
              }
            }}
            placeholder="Contact name"
            className="w-full rounded border border-violet-300 px-1.5 py-0.5 text-sm"
          />
        ) : (
          <button
            onClick={() => setEditName(true)}
            className={`text-left text-sm ${name ? "font-medium text-slate-800" : "text-slate-400"} hover:underline`}
          >
            {name || "+ add contact"}
          </button>
        )}
        {name && (
          <button
            title={isVerified ? "Verified — click to unverify" : "Mark verified"}
            onClick={() => {
              const next = !isVerified;
              setVerified(next);
              save({ contact_verified: next });
            }}
            className={`shrink-0 rounded-full px-1 text-xs ${
              isVerified ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
            }`}
          >
            {isVerified ? "✓ verified" : "verify"}
          </button>
        )}
      </div>

      {/* LinkedIn */}
      {editLi ? (
        <input
          autoFocus
          value={li}
          onChange={(e) => setLi(e.target.value)}
          onBlur={() => {
            setEditLi(false);
            if (li !== (linkedinUrl ?? "")) save({ linkedin_url: li });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setLi(linkedinUrl ?? "");
              setEditLi(false);
            }
          }}
          placeholder="Paste LinkedIn profile URL"
          className="w-full rounded border border-violet-300 px-1.5 py-0.5 text-xs"
        />
      ) : (
        <div className="flex items-center gap-2 text-xs">
          {li ? (
            <a
              href={li}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#0a66c2] hover:underline"
            >
              in/{handle ?? "profile"}
            </a>
          ) : (
            <a
              href={linkedinPeopleSearch(companyName, city)}
              target="_blank"
              rel="noreferrer"
              className="text-slate-500 hover:text-[#0a66c2] hover:underline"
            >
              ↗ find on LinkedIn
            </a>
          )}
          <button
            onClick={() => setEditLi(true)}
            className="text-slate-400 hover:text-slate-600"
          >
            {li ? "edit" : "+ paste URL"}
          </button>
        </div>
      )}
      {saving && <span className="text-[10px] text-slate-400">saving…</span>}
    </div>
  );
}
