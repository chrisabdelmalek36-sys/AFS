-- People-enrichment fields on each lead: the decision-maker's name/title,
-- their LinkedIn profile, and a "verified" flag the user toggles once a real
-- person + profile is confirmed. contact_person already exists (001_init).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_title    TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_url     TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_verified BOOLEAN NOT NULL DEFAULT false;
