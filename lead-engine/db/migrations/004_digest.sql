-- Phase 4: daily owner digest + follow-up scheduling.

CREATE TABLE IF NOT EXISTS digests (
  id          BIGSERIAL PRIMARY KEY,
  for_date    DATE NOT NULL,
  sent_to     TEXT,
  provider    TEXT,                          -- resend | simulated
  status      TEXT NOT NULL DEFAULT 'built', -- built | sent | simulated | failed
  summary     JSONB NOT NULL DEFAULT '{}'::jsonb,
  body        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_digests_date ON digests (for_date DESC);

-- Optional explicit next-follow-up date (overrides the 7-day default).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;
