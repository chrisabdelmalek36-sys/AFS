-- Phase 2: contact history (used by /lead/[id] "mark as contacted")
CREATE TABLE IF NOT EXISTS contact_history (
  id          BIGSERIAL PRIMARY KEY,
  lead_id     BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL,                 -- visit | email | whatsapp | linkedin | phone | note
  direction   TEXT NOT NULL DEFAULT 'out',   -- out | in
  note        TEXT,
  new_status  TEXT,                          -- status the lead moved to, if any
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contact_history_lead ON contact_history (lead_id, created_at DESC);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
