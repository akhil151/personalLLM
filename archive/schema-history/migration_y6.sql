-- MIGRATION Y.6: SCHEMA CONVERGENCE
-- Auditor: Principal Architect
-- Goal: Standardize on agent_runs and repair checkpointing.

BEGIN;

-- 1. CLEANUP LEGACY TABLES
-- Drop workflow_runs if it exists after migrating any data (none exists currently)
DROP TABLE IF EXISTS workflow_runs CASCADE;

-- 2. REPAIR agent_runs
-- Add missing lease columns to agent_runs
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS lease_owner TEXT;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMP WITH TIME ZONE;

-- 3. REPAIR workflow_snapshots
-- Standardize column name to 'run_id' and reference 'agent_runs'
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workflow_snapshots' AND column_name='workflow_run_id') THEN
        ALTER TABLE workflow_snapshots RENAME COLUMN workflow_run_id TO run_id;
    END IF;
END $$;

-- Ensure foreign key points to agent_runs
ALTER TABLE workflow_snapshots DROP CONSTRAINT IF EXISTS workflow_snapshots_workflow_run_id_fkey;
ALTER TABLE workflow_snapshots DROP CONSTRAINT IF EXISTS workflow_snapshots_run_id_fkey;
ALTER TABLE workflow_snapshots ADD CONSTRAINT workflow_snapshots_run_id_fkey 
    FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE CASCADE;

-- 4. REPAIR background_jobs
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='background_jobs' AND column_name='workflow_run_id') THEN
        ALTER TABLE background_jobs RENAME COLUMN workflow_run_id TO run_id;
    END IF;
END $$;

ALTER TABLE background_jobs DROP CONSTRAINT IF EXISTS background_jobs_workflow_run_id_fkey;
ALTER TABLE background_jobs DROP CONSTRAINT IF EXISTS background_jobs_run_id_fkey;
ALTER TABLE background_jobs ADD CONSTRAINT background_jobs_run_id_fkey 
    FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE CASCADE;

-- 5. REPAIR workflow_events
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workflow_events' AND column_name='workflow_run_id') THEN
        ALTER TABLE workflow_events RENAME COLUMN workflow_run_id TO run_id;
    END IF;
END $$;

ALTER TABLE workflow_events DROP CONSTRAINT IF EXISTS workflow_events_workflow_run_id_fkey;
ALTER TABLE workflow_events DROP CONSTRAINT IF EXISTS workflow_events_run_id_fkey;
ALTER TABLE workflow_events ADD CONSTRAINT workflow_events_run_id_fkey 
    FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE CASCADE;

-- 6. REPAIR browser_sessions
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='browser_sessions' AND column_name='workflow_run_id') THEN
        ALTER TABLE browser_sessions RENAME COLUMN workflow_run_id TO run_id;
    END IF;
END $$;

ALTER TABLE browser_sessions DROP CONSTRAINT IF EXISTS browser_sessions_workflow_run_id_fkey;
ALTER TABLE browser_sessions DROP CONSTRAINT IF EXISTS browser_sessions_run_id_fkey;
ALTER TABLE browser_sessions ADD CONSTRAINT browser_sessions_run_id_fkey 
    FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE CASCADE;

-- 7. CLEANUP OLD INDEXES & ADD NEW ONES
DROP INDEX IF EXISTS idx_workflow_runs_user_id;
CREATE INDEX IF NOT EXISTS idx_workflow_snapshots_run_id ON workflow_snapshots(run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_events_run_id ON workflow_events(run_id);
CREATE INDEX IF NOT EXISTS idx_background_jobs_run_id ON background_jobs(run_id);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_run_id ON browser_sessions(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_user_id ON agent_runs(user_id);

COMMIT;
