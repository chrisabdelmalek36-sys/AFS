-- The SINGLE source of the chk_status constraint. Always lists the FULL set
-- of allowed statuses, because the bootstrap re-runs every migration on each
-- cold start — a partial list here would reject rows already on newer statuses
-- and break startup. To add/rename a status: edit THIS list and
-- src/lib/statuses.ts (no new constraint migration needed).
ALTER TABLE leads DROP CONSTRAINT IF EXISTS chk_status;
ALTER TABLE leads ADD CONSTRAINT chk_status CHECK (status IN (
  'New','Contacted','Waiting for reply','Replied','Meeting',
  'Quote Sent','Negotiation','Postponed','Closed Won','Closed Lost','Not Interested'
));
