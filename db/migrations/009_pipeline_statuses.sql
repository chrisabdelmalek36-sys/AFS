-- Expand the lead status pipeline to the full set used across the app.
-- Keep in sync with src/lib/statuses.ts. All previously-allowed values are
-- retained, so existing rows stay valid.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS chk_status;
ALTER TABLE leads ADD CONSTRAINT chk_status CHECK (status IN (
  'New','Contacted','Waiting for reply','Replied','Meeting',
  'Quote Sent','Negotiation','Postponed','Closed Won','Closed Lost','Not Interested'
));
