-- Memory of user-deleted leads. The scanner re-discovers the same businesses
-- on every pass, so a plain row delete would resurrect them — ingest checks
-- this table and skips anything the user explicitly deleted.
CREATE TABLE IF NOT EXISTS deleted_leads (
  dedup_hash TEXT PRIMARY KEY,
  name       TEXT,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
