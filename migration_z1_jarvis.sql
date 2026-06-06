-- PHASE Z.1: JARVIS IDENTITY & PERSISTENCE
-- This table stores the high-level state of the Jarvis assistant for each user.

BEGIN;

CREATE TABLE jarvis_state (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_project TEXT,
    active_goal TEXT,
    last_session_summary TEXT,
    context_metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE jarvis_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own jarvis state" ON jarvis_state 
FOR ALL USING (auth.uid() = user_id);

-- Initial state trigger or helper function could go here, 
-- but we'll handle it in the service layer for now.

COMMIT;
