// Phase 2: rule-based visit brief & message starters.
// Phase 3 replaces these with Claude-personalised drafts using live news.

const AFS_CONTEXT =
  "AFS Trade — 33 years sole distributor of Nardi (premium Italian outdoor " +
  "furniture) in Egypt. References: Mövenpick Soma Bay, Stella Di Mare, Emaar Mivida.";

const BY_CATEGORY: Record<
  string,
  { ask: string; bring: string[]; openers: string[] }
> = {
  hotel: {
    ask: "F&B / Procurement or Purchasing Manager",
    bring: ["Mini Nardi catalogue", "Business card", "Fabric/finish swatch"],
    openers: [
      "Which outdoor areas are you refurbishing this season — pool, terrace, rooftop?",
      "We supplied the outdoor furniture at Mövenpick Soma Bay — happy to share the spec.",
      "Nardi is UV- and salt-resistant — ideal for your sea-facing terraces.",
    ],
  },
  resort: {
    ask: "Purchasing / FF&E Manager or GM",
    bring: ["Mini Nardi catalogue", "Business card", "Sample swatch"],
    openers: [
      "Are you planning any pool or beach area upgrades before high season?",
      "Our Nardi pieces are at several Red Sea resorts — fully marine-grade.",
      "We can phase delivery to match your renovation schedule.",
    ],
  },
  developer: {
    ask: "Procurement Lead or Project / Clubhouse Manager",
    bring: ["Project portfolio", "Business card", "Catalogue"],
    openers: [
      "Which upcoming phase needs clubhouse and landscape furniture?",
      "We furnished outdoor areas at Emaar Mivida — references available.",
      "Nardi offers volume pricing for multi-phase compound rollouts.",
    ],
  },
  restaurant: {
    ask: "Owner or Operations Manager",
    bring: ["Catalogue", "Business card", "Swatch"],
    openers: [
      "Are you expanding the outdoor seating or opening a new branch?",
      "Nardi chairs stack and survive daily commercial use outdoors.",
      "Quick lead times — we hold popular models in Egypt stock.",
    ],
  },
  cafe: {
    ask: "Owner or Manager",
    bring: ["Catalogue", "Business card"],
    openers: [
      "Planning a terrace refresh for the new season?",
      "Lightweight, stackable Nardi seating — low maintenance for cafés.",
      "Showroom visit any time to see the finishes in person.",
    ],
  },
  school: {
    ask: "Facilities / Procurement Manager",
    bring: ["Catalogue", "Business card"],
    openers: [
      "Are the courtyard or canteen outdoor areas being upgraded?",
      "Durable, weatherproof seating sized for school common areas.",
      "We can quote against your tender requirements.",
    ],
  },
  university: {
    ask: "Facilities / Campus Procurement",
    bring: ["Project portfolio", "Catalogue", "Business card"],
    openers: [
      "Any campus landscape or plaza projects in the pipeline?",
      "Nardi handles heavy daily student use and full sun.",
      "Framework pricing available for large campus orders.",
    ],
  },
};

const DEFAULT = {
  ask: "Procurement / Facilities decision-maker",
  bring: ["Mini Nardi catalogue", "Business card", "Sample swatch"],
  openers: [
    "Do you have any outdoor furnishing projects coming up?",
    "We are the 33-year Nardi distributor in Egypt — premium, in stock.",
    "Happy to arrange a showroom visit or send a tailored quote.",
  ],
};

export function visitBrief(lead: {
  name: string;
  category: string | null;
  tier: string | null;
  address: string | null;
}) {
  const c = BY_CATEGORY[lead.category ?? ""] ?? DEFAULT;
  return {
    headline: `${lead.name} — ${lead.tier ?? "Unrated"} ${lead.category ?? ""}`.trim(),
    address: lead.address ?? "Address not on file",
    askFor: c.ask,
    bring: c.bring,
    openers: c.openers,
    context: AFS_CONTEXT,
  };
}

export function whatsappDraft(lead: { name: string; category: string | null }) {
  return (
    `Hello ${lead.name}, this is AFS Trade — the 33-year sole distributor ` +
    `of Nardi premium Italian outdoor furniture in Egypt (references include ` +
    `Mövenpick Soma Bay and Emaar Mivida). We'd love to show you options for ` +
    `your outdoor areas. May I send our catalogue or arrange a quick visit?`
  );
}
