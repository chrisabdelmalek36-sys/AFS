-- Small key/value store for engine state that must survive across
-- serverless invocations (e.g. the resumable OSM scan cursor).
CREATE TABLE IF NOT EXISTS app_state (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
