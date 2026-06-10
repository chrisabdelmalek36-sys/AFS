-- Historically this added "Postponed" to the chk_status constraint.
--
-- The chk_status constraint is now owned solely by migration 009, which always
-- declares the FULL status set. That matters because the bootstrap re-runs
-- every migration on each cold start: if this file re-added a *narrower* set,
-- a lead already on a newer status (e.g. Negotiation) would violate it and the
-- whole bootstrap would fail. So this migration is intentionally a no-op now —
-- to change the allowed statuses, edit 009_pipeline_statuses.sql (and
-- src/lib/statuses.ts) only.
SELECT 1;
