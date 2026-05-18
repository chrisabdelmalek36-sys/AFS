-- Phase 3: outreach drafting, email sequence, compliance tracking.

CREATE TABLE IF NOT EXISTS outreach_messages (
  id            BIGSERIAL PRIMARY KEY,
  lead_id       BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL,                 -- email | whatsapp | linkedin | visit
  step_index    INTEGER NOT NULL DEFAULT 0,    -- email sequence: 0,1,2,3,4
  step_label    TEXT,                          -- 'Day 0', 'Day 3', ...
  subject       TEXT,
  body          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft', -- draft|scheduled|sent|simulated|skipped|failed
  scheduled_for TIMESTAMPTZ,
  sent_at       TIMESTAMPTZ,
  provider      TEXT,                          -- resend | simulated | manual
  provider_msg_id TEXT,
  generated_by  TEXT NOT NULL DEFAULT 'template', -- claude | template
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outreach_lead   ON outreach_messages (lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach_messages (status);
CREATE INDEX IF NOT EXISTS idx_outreach_due
  ON outreach_messages (scheduled_for)
  WHERE status = 'scheduled';
-- One row per lead/channel/step (regenerating updates in place).
CREATE UNIQUE INDEX IF NOT EXISTS uq_outreach_lcs
  ON outreach_messages (lead_id, channel, step_index);

CREATE TABLE IF NOT EXISTS email_events (
  id          BIGSERIAL PRIMARY KEY,
  message_id  BIGINT REFERENCES outreach_messages(id) ON DELETE CASCADE,
  lead_id     BIGINT REFERENCES leads(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,                   -- open | click | unsubscribe | bounce | reply
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_events_lead ON email_events (lead_id);

-- Tracks whether a lead has had outreach generated, for the queue view.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS outreach_generated_at TIMESTAMPTZ;
