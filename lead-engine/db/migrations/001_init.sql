-- AFS Lead Engine — Phase 1 schema
-- Idempotent: safe to run repeatedly.

CREATE TABLE IF NOT EXISTS crawl_runs (
  id            BIGSERIAL PRIMARY KEY,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  mode          TEXT NOT NULL,                 -- 'sample' | 'live'
  status        TEXT NOT NULL DEFAULT 'running', -- running | ok | budget_capped | error
  est_cost_usd  NUMERIC(10,4) NOT NULL DEFAULT 0,
  stats         JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes         TEXT
);

CREATE TABLE IF NOT EXISTS api_usage (
  id            BIGSERIAL PRIMARY KEY,
  run_id        BIGINT REFERENCES crawl_runs(id) ON DELETE SET NULL,
  usage_day     DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Cairo'),
  provider      TEXT NOT NULL,                 -- google_places | google_details | newsapi | gdelt
  calls         INTEGER NOT NULL DEFAULT 0,
  est_cost_usd  NUMERIC(10,4) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_usage_day ON api_usage (usage_day);

-- Do-not-contact: anyone who says "stop"/unsubscribes is blocked forever,
-- across every channel. Matched on normalized phone, email, or name.
CREATE TABLE IF NOT EXISTS do_not_contact (
  id            BIGSERIAL PRIMARY KEY,
  phone_norm    TEXT,
  email         TEXT,
  name_norm     TEXT,
  channel       TEXT NOT NULL DEFAULT 'all',   -- all | email | whatsapp | linkedin | visit
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dnc_phone ON do_not_contact (phone_norm);
CREATE INDEX IF NOT EXISTS idx_dnc_email ON do_not_contact (lower(email));
CREATE INDEX IF NOT EXISTS idx_dnc_name  ON do_not_contact (name_norm);

CREATE TABLE IF NOT EXISTS leads (
  id                BIGSERIAL PRIMARY KEY,
  dedup_hash        TEXT NOT NULL UNIQUE,            -- sha256(phone|name|address)
  google_place_id   TEXT UNIQUE,
  name              TEXT NOT NULL,
  name_norm         TEXT NOT NULL,
  category          TEXT,
  sub_category      TEXT,
  address           TEXT,
  city              TEXT,
  region            TEXT,
  country           TEXT NOT NULL DEFAULT 'Egypt',
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  phone             TEXT,
  phone_norm        TEXT,
  website           TEXT,
  email             TEXT,
  contact_person    TEXT,
  tier              TEXT,                            -- Platinum | Gold | Silver | Unrated
  tier_reason       TEXT,
  est_deal_min_egp  BIGINT,
  est_deal_max_egp  BIGINT,
  status            TEXT NOT NULL DEFAULT 'New',
  freshness         INTEGER NOT NULL DEFAULT 50,     -- 0..100
  discovered_date   DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Cairo'),
  first_seen        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen         TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_primary    TEXT,
  source_url        TEXT,
  suppressed        BOOLEAN NOT NULL DEFAULT false,  -- on do-not-contact list
  suppressed_reason TEXT,
  raw               JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT chk_status CHECK (status IN
    ('New','Contacted','Replied','Meeting','Quote Sent','Closed Won','Closed Lost')),
  CONSTRAINT chk_tier CHECK (tier IN ('Platinum','Gold','Silver','Unrated'))
);
CREATE INDEX IF NOT EXISTS idx_leads_tier      ON leads (tier);
CREATE INDEX IF NOT EXISTS idx_leads_city      ON leads (city);
CREATE INDEX IF NOT EXISTS idx_leads_region    ON leads (region);
CREATE INDEX IF NOT EXISTS idx_leads_category  ON leads (category);
CREATE INDEX IF NOT EXISTS idx_leads_status    ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_freshness ON leads (freshness DESC);
CREATE INDEX IF NOT EXISTS idx_leads_discovered ON leads (discovered_date DESC);

-- Provenance: a lead can be confirmed by several sources over time.
CREATE TABLE IF NOT EXISTS lead_sources (
  id          BIGSERIAL PRIMARY KEY,
  lead_id     BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  source      TEXT NOT NULL,                 -- google_places | newsapi | gdelt | gov_tender | sample
  source_url  TEXT,
  detail      JSONB NOT NULL DEFAULT '{}'::jsonb,
  seen_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_sources_lead ON lead_sources (lead_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_source
  ON lead_sources (lead_id, source, COALESCE(source_url, ''));
