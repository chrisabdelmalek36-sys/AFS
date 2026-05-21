# AFS Lead Engine

A single **Next.js 14** project that finds, tiers, and works real B2B leads
for **AFS Trade** — the 33-year sole distributor of **Nardi** premium
Italian outdoor furniture in Egypt.

Deploys to Vercel in one click. Runs the daily lead finder automatically
on a free schedule. No paid APIs required out of the box.

## What it does

| | |
|---|---|
| **Discovers** real Egyptian businesses (hotels, resorts, restaurants, schools, universities, hospitals) from free **OpenStreetMap** + free news (GDELT) + optional Google Maps. |
| **Dedupes** by phone-first hash so the same business never appears twice. |
| **Tiers** every lead Platinum / Gold / Silver with an EGP deal estimate. |
| **Generates outreach** across all channels: 5-step email sequence (Day 0/3/8/15/30) + WhatsApp pre-filled link + LinkedIn draft + door-to-door visit brief — by template, or via Claude when you add a key. |
| **Sends emails** safely: simulated by default; real send only when both `RESEND_API_KEY` and `OUTREACH_LIVE_SEND=true` are set. |
| **Compliance**: signed unsubscribe link on every cold email; opt-out is permanent and blocks the lead on every channel forever. |
| **Plans visit routes** on a Google-Maps-style map: pick a region, get an optimised driving order, open it on your phone in Google Maps. |
| **Daily digest** at 07:00 Africa/Cairo: new leads, follow-ups due, planned visits, hot news matches — emailed to you. |
| **Automatic**: Vercel Cron runs the news + outreach + digest daily for free. Full OSM scan runs on deploy or via the optional GitHub Actions workflow. |

## Six screens

`/dashboard` · `/leads` · `/map` · `/lead/[id]` · `/outreach` · `/digest`

## Run locally

```bash
cp .env.example .env.local                # at minimum set DATABASE_URL
npm install
npm run migrate                           # create tables
npm run seed                              # do-not-contact demo entry
npm run pipeline -- --mode=sample         # load 21 practice leads
npm run pipeline -- --mode=live           # real Egyptian leads (free)
npm run dev                               # open http://localhost:3000
```

## Useful npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dashboard in dev mode. |
| `npm run build` | Production build. The `postbuild` hook auto-migrates, seeds, and loads real leads. |
| `npm run start` | Serve the production build. |
| `npm run migrate` | Apply all SQL migrations in `db/migrations/`. |
| `npm run seed` | Insert the demo do-not-contact record. |
| `npm run pipeline -- --mode=sample\|live` | Run discovery once. |
| `npm run outreach` | Process the email sequence queue once. |
| `npm run digest` | Build (and email) today's owner digest. |
| `npm run estimate` | Show the projected cost of a live Google Maps day (OSM is free). |
| `npm run leads` | Print everything in the database. |
| `npm run cron` | Stay running and trigger discovery / outreach / digest on schedule (Africa/Cairo). |

## Deploy to Vercel

1. Create a Vercel project from this repo. Framework auto-detects as **Next.js**.
2. Add a free **Neon Postgres** database via the Storage tab (sets `DATABASE_URL` automatically).
3. Click **Deploy**. The `postbuild` hook runs migrations and populates real Egyptian leads from OpenStreetMap on first deploy.
4. Vercel's built-in Cron runs `/api/cron/refresh` daily — free news refresh + outreach send + digest, no other configuration needed.

Optional keys (set in **Vercel → Settings → Environment Variables**):

| Key | What it unlocks |
|---|---|
| `ANTHROPIC_API_KEY` | Claude-personalised outreach drafts (otherwise: strong templates) |
| `RESEND_API_KEY` + `OUTREACH_LIVE_SEND=true` | Actually send the email sequence (otherwise: simulated) |
| `AFS_OWNER_EMAIL` | Where the daily 07:00 digest is sent |
| `GOOGLE_MAPS_API_KEY` | Layer richer business data on top of OSM (also: route waypoint optimisation) |
| `NEWSAPI_KEY` | Paid news tier (GDELT is free and always on) |

## Layout

```
.
├── src/
│   ├── app/                # Next.js routes (pages + API)
│   ├── components/         # React components (map, UI)
│   └── lib/
│       ├── db.ts           # shared Postgres pool (q + query)
│       ├── leads.ts        # dashboard data layer
│       ├── outreach.ts     # Claude / template drafts
│       ├── compliance.ts   # unsubscribe + email footer
│       ├── route.ts        # nearest-neighbour route planner
│       └── engine/         # lead discovery, sources, pipeline
│           ├── config.ts   # geo zones, categories, env
│           ├── pipeline.ts # discover → dedupe → enrich → tier → store
│           ├── sender.ts   # email sequence processor
│           ├── digest-builder.ts
│           ├── quick-refresh.ts
│           ├── sources/    # osmPlaces, googlePlaces, news, gov, sample
│           ├── enrich/     # robots.txt + website scraping
│           └── util/       # dedup, tiering, freshness, budget, logger
├── scripts/                # tsx CLIs (migrate, seed, pipeline, …)
├── db/migrations/          # idempotent SQL migrations (001–005)
├── .github/workflows/
│   └── lead-engine.yml     # daily scheduled full-scan job
└── vercel.json             # Vercel build + cron schedule
```

## Compliance, baked in

- Egyptian Personal Data Protection Law 151/2020 friendly: never scrapes
  personal-profile data, only public business listings + companies' own
  websites.
- `robots.txt` respected on every site we touch.
- Every cold email carries a working, signed unsubscribe link + a physical
  address.
- Unsubscribing is permanent and suppresses the lead on **every** channel
  forever.
- Outreach auto-stops the moment the lead replies, advances in the
  pipeline, or is suppressed.

## What's NOT free

- **Google Maps API** (optional): Google requires a card on file even for
  free-tier usage. The system runs perfectly without it on OpenStreetMap.
- **Anthropic Claude** (optional): pay-as-you-go for AI-personalised
  outreach copy. Strong templates work without a key.
- **Resend** (optional): generous free tier for outbound email; only
  needed if you flip `OUTREACH_LIVE_SEND=true`.
