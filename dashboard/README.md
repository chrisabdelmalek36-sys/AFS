# AFS Lead Engine — Phase 2: Dashboard, Map & Route Planner

The screen you actually use. It reads the **same database** the Phase 1
engine fills, so everything you see here is real lead data.

No Google key needed — the map uses free OpenStreetMap tiles, so you can
click everything today with the practice data.

---

## Run it

Phase 1 must have run at least once (so the database has leads).

```bash
# 1. make sure the database has leads
cd ../lead-engine && npm run dev          # migrate + sample leads

# 2. start the dashboard
cd ../dashboard
cp .env.example .env                      # default points at the same DB
npm install
npm run build && npm run start            # open http://localhost:3000
```

(For live editing use `npm run dev` instead of build/start.)

---

## The four screens

| Page | What it does |
|---|---|
| **/dashboard** | New leads today, total, **pipeline value** (sum of deal estimates), follow-ups due, recent discovery runs + their cost. |
| **/leads** | Every lead in a sortable table. Filter by tier, category, region, city, status, or search by name. Suppressed (do-not-contact) leads are greyed and clearly marked. |
| **/map** | Every lead as a pin on the map of Egypt, **colored by tier** (purple = Platinum, amber = Gold, grey = Silver). Click a pin → jump to the lead. **Plan a visit route**: pick a region + number of stops → it orders them into an efficient driving loop and gives you an **"Open in Google Maps"** button that launches turn-by-turn navigation on your phone. |
| **/lead/[id]** | Full detail, why it got its tier, contact history, **WhatsApp Mode 1** (opens WhatsApp with the message pre-typed — you press send), a **visit brief** (who to ask for, what to bring, 3 conversation openers tailored to the category), and a form to **log a contact / change status**. |

---

## Route planner — how it works without a Google key

- It orders your chosen stops with a nearest-neighbour algorithm (a good
  driving loop) — runs locally, costs nothing.
- It builds a normal Google Maps directions link. Tapping it opens the
  Google Maps app and navigates — **no API key required to navigate.**
- *Optional upgrade:* set `GOOGLE_MAPS_API_KEY` in `.env` and it will ask
  Google for a fully optimised waypoint order instead. Everything still
  works without it.

---

## Status pipeline (Phase 4 foundation)

Each lead moves: **New → Contacted → Replied → Meeting → Quote Sent →
Closed Won / Closed Lost**. Logging a contact stamps the date; the
dashboard automatically lists anything contacted 7+ days ago with no
progress as a **follow-up due**.

---

## Phase 3 — Outreach (built)

Open any lead → **Generate Outreach**. The system writes, per lead:

- **Email**: a 5-step sequence (Day 0 / 3 / 8 / 15 / 30), each with a
  compliant footer (unsubscribe link + physical address).
- **WhatsApp**: Mode 1 — opens WhatsApp with the message pre-typed.
- **LinkedIn**: draft only (paste manually — protects your account).
- **Visit**: a 1-page door-to-door brief.

Drafts use **strong templates by default (no AI key, no cost)**. Add
`ANTHROPIC_API_KEY` for Claude-personalised drafts — no code change.

The **/outreach** page monitors every lead's sequence progress.

**Safety, enforced:**

- Emails only actually send when `RESEND_API_KEY` is set **and**
  `OUTREACH_LIVE_SEND=true`. Otherwise every send is **simulated**
  (nothing leaves) — so it is safe by default.
- Every email carries a working, signed unsubscribe link. Unsubscribing
  is permanent and blocks the lead on **every** channel forever.
- The sequence auto-stops if the lead replies, advances, or is
  suppressed. The engine worker processes the queue (`npm run outreach`,
  or automatically via the daily worker).

## What's next

**Phase 4** — auto follow-up reminders and a 7 AM Cairo daily digest
email. Phases 1–3 are complete and proven end-to-end on sample data.
