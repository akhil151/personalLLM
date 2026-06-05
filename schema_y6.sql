-- PHASE Y.6 — SCHEMA CONVERGENCE
-- Standardizes on agent_runs as the single source of truth.

-- 1. Core Tables
CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    goal TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused', 'recovered')),
    metadata JSONB DEFAULT '{}'::jsonb,
    lease_owner TEXT,
    lease_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Checkpointing
CREATE TABLE IF NOT EXISTS workflow_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    state_data JSONB NOT NULL,
    step_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Observability & Events
CREATE TABLE IF NOT EXISTS workflow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 4. Infrastructure
CREATE TABLE IF NOT EXISTS background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'retrying')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_log TEXT,
    next_run_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 5. Browser Sessions (Updated to reference agent_runs)
CREATE TABLE IF NOT EXISTS browser_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('active', 'closed', 'paused')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_snapshots_run_id ON workflow_snapshots(run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_events_run_id ON workflow_events(run_id);
CREATE INDEX IF NOT EXISTS idx_background_jobs_run_id ON background_jobs(run_id);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_run_id ON browser_sessions(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_user_id ON agent_runs(user_id);
