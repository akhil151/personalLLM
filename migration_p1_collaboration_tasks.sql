    -- ==================================================
    -- PHASE P1 MIGRATION: Collaboration Requests Enhancement
    -- Adds task_id and user_id to collaboration_requests
    -- ==================================================

    ALTER TABLE collaboration_requests 
    ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE;

    ALTER TABLE collaboration_requests 
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_collaboration_requests_task_id ON collaboration_requests(task_id);
    CREATE INDEX IF NOT EXISTS idx_collaboration_requests_user_id ON collaboration_requests(user_id);
