# AFS Lead Engine — Phase 1: Daily Lead Discovery

This is the first piece of your lead system. It does one job, well:
**every day it finds businesses in Egypt that could buy Nardi outdoor
furniture, removes duplicates, scores them, and stores them in a
database.** No website yet (that's Phase 2) — this is the engine
underneath it.

It is built so that **today** you can prove it works with zero cost and
zero API keys, and **later** you flip one switch to get real leads.

---

## 1. What it does

```
SOURCES ─▶ DEDUPE ─▶ ENRICH ─▶ TIER ─▶ DATABASE
```

- **Sources**
  - Google Maps Places (hotels, resorts, restaurants, developers,
    architects, schools, universities, hospitals, clubs… across all
    of Egypt — Cairo, Red Sea, North Coast, Sinai, Alexandria, Luxor,
    Aswan)
  - News (GDELT — free; NewsAPI — optional) for "hot" project /
    expansion announcements (Emaar, SODIC, Palm Hills, Tatweer Misr,
    Hassan Allam, Orascom, Mountain View, Madinet Masr, TDA/NUCA…)
  - Government / tender feeds (any RSS URLs you add)
- **Dedupe** — a lead is keyed by phone (strongest signal), or
  name+address when there's no phone. The same business from two
  sources **never** becomes two rows. Proven across runs.
- **Enrich** — finds a business email on the company's **own** website
  only, and respects `robots.txt`. Never touches personal data.
- **Tier** — Platinum / Gold / Silver with an EGP deal-size estimate,
  using your rules (5-star hotels & top-20 developers = Platinum, etc.).
- **Database** — Postgres tables: `leads`, `lead_sources`,
  `do_not_contact`, `api_usage`, `crawl_runs`.

---

## 2. Run the proof right now (no keys, no cost)

You need Node 22+ and a Postgres database.

```bash
cd lead-engine
cp .env.example .env          # defaults are fine for the proof
npm install
npm run dev                   # migrate → seed → sample run → print DB
```

`npm run dev` runs in **sample mode**: a built-in realistic Egyptian
dataset flows through the exact same pipeline. You will see ~21 leads
in the database, tiered, with one business **suppressed** because it's
on the do-not-contact list, and a duplicate correctly collapsed.

Useful individual commands:

| Command | What it does |
|---|---|
| `npm run migrate` | Create / update database tables |
| `npm run pipeline` | Run discovery once (mode from `.env`) |
| `npm run pipeline -- --mode=sample` | Force sample (offline) run |
| `npm run pipeline -- --mode=live` | Force a real run (needs keys) |
| `npm run leads` | Print everything in the database |
| `npm run estimate` | Show what a live daily run would cost first |
| `npm run cron` | Stay running, scan daily at 06:00 Cairo |

---

## 3. Going live (real leads)

1. Get a **Google Maps API key**
   <https://console.cloud.google.com> → enable *Places API (New)* →
   enable billing.
2. (Optional) Get a **NewsAPI key** at <https://newsapi.org>. Without
   it, free GDELT news is still used.
3. Edit `.env`:
   ```
   PIPELINE_MODE=live
   GOOGLE_MAPS_API_KEY=your_key
   NEWSAPI_KEY=your_key        # optional
   ```
4. **Check the cost first:** `npm run estimate`
5. Run: `npm run pipeline` then `npm run leads`.

No code changes — the same pipeline now pulls real businesses.

---

## 4. You will not get a surprise bill

- `MONTHLY_BUDGET_USD` (default **200**) is a hard cap. Every API call's
  estimated cost is recorded in `api_usage`; the crawler **stops** when
  the month's spend would exceed the cap.
- `MAX_PLACES_CALLS_PER_RUN` (default **120**) limits each day's scan.
- A full all-Egypt daily scan ≈ **$115/month** at the capped rate —
  inside your $100–300 budget. `npm run estimate` always shows the
  number before you spend anything.

---

## 5. Running it on your own server in Egypt (plain version)

You don't need to understand cloud hosting. The whole thing is packaged
so it runs on **one machine** and the data stays **on that machine**.

On any Egyptian VPS (or even a spare PC) that has Docker:

```bash
cd lead-engine
docker compose up -d                       # starts database + worker
docker compose run --rm app npm run migrate
docker compose run --rm app npm run pipeline
```

The worker then scans automatically every morning. Because everything
lives on your server, the data never leaves Egypt — which keeps you
aligned with Egyptian Personal Data Protection Law 151/2020. We finalize
the exact server in Phase 2; nothing here locks you in.

---

## 6. Legal & ethical guardrails (built in, enforced)

- **No personal-profile scraping.** Only public business listings and
  companies' own websites. No LinkedIn personal data.
- **robots.txt respected** on every site we read for email enrichment.
- **Do-not-contact list is permanent.** Anyone in `do_not_contact`
  (matched by phone, email, or name) is auto-flagged `suppressed` on
  every future run, across all channels. Outreach (Phase 3) will refuse
  to contact suppressed leads.
- Email/WhatsApp compliance (unsubscribe footer, business numbers only,
  Mode-1 manual WhatsApp) arrives with Phase 3.

---

## 7. What's next

**Phase 2** — a web dashboard (leads table, map with tier-colored pins,
route planner). Phase 1's database is already shaped for it.

Phase 1 is complete and proven. Review the leads above, then say the
word and I'll start Phase 2.
