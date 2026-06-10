-- Notion-parity fields so the website's Leads database matches the Notion one:
-- Priority (Hot/High/Standard), free-text Notes, and Email Status
-- (Valid/Catch-all). Company, Job Title, LinkedIn, Email, Location and Deal
-- size already exist as name/contact_title/linkedin_url/email/city+region/
-- est_deal_*.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority     TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes        TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_status TEXT;
