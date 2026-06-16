-- Migration: Add scheduler_heartbeats table
-- Purpose: Track scheduler health and ensure it's running

CREATE TABLE IF NOT EXISTS scheduler_heartbeats (
  worker_id TEXT PRIMARY KEY,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast querying of latest heartbeat
CREATE INDEX IF NOT EXISTS idx_scheduler_heartbeats_last_heartbeat ON scheduler_heartbeats(last_heartbeat DESC);
