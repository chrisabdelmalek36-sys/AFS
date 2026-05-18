-- Add "Postponed" to the lead status pipeline.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS chk_status;
ALTER TABLE leads ADD CONSTRAINT chk_status CHECK (status IN (
  'New','Contacted','Replied','Meeting','Quote Sent',
  'Closed Won','Closed Lost','Postponed'
));
