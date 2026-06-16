-- ==================================================
-- PHASE P2: SCHEDULING & WORKFLOW RECOVERY MIGRATION
-- Adds autonomous_schedules, improves workflow leasing, and indexes for recovery
-- ==================================================

-- --------------------------------------------------
-- STEP 1: DEBUG: Verify agent_runs columns and schema
-- --------------------------------------------------
-- Run this first to confirm you're in the right schema:
-- SELECT table_schema, table_name, column_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'agent_runs' AND column_name LIKE 'lease%';

-- --------------------------------------------------
-- STEP 2: Ensure we're in the public schema
-- --------------------------------------------------
SET search_path TO public;

-- --------------------------------------------------
-- STEP 3: Add leasing columns to agent_runs
-- --------------------------------------------------
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS lease_owner TEXT;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMP WITH TIME ZONE;

-- --------------------------------------------------
-- STEP 4: Create autonomous_schedules table
-- --------------------------------------------------
CREATE TABLE IF NOT EXISTS autonomous_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
    workflow_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    cron_expression TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'processing', 'completed', 'paused', 'failed')),
    lease_owner TEXT,
    lease_expires_at TIMESTAMP WITH TIME ZONE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- --------------------------------------------------
-- STEP 5: Add indexes for scheduler performance
-- --------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_autonomous_schedules_status_next_run ON autonomous_schedules(status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_autonomous_schedules_user_id ON autonomous_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_schedules_lease ON autonomous_schedules(lease_owner, lease_expires_at);

-- --------------------------------------------------
-- STEP 6: Add indexes to agent_runs (split to avoid errors)
-- --------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_agent_runs_user_id ON agent_runs(user_id);

-- Check if lease columns exist before creating combined index
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_runs' 
        AND table_schema = 'public'
        AND column_name = 'lease_owner'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_runs' 
        AND table_schema = 'public'
        AND column_name = 'lease_expires_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_agent_runs_status_lease 
        ON agent_runs(status, lease_owner, lease_expires_at);
    ELSE
        RAISE NOTICE 'Lease columns not found in agent_runs, skipping combined index';
    END IF;
END $$;

-- --------------------------------------------------
-- STEP 7: Add indexes to workflow_snapshots
-- --------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_workflow_snapshots_run_id ON workflow_snapshots(run_id);
