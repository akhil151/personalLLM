-- ==================================================
-- PHASE Z.4.7: Fix user_progress_metrics table - add updated_at column
-- ==================================================

-- Add updated_at column to user_progress_metrics
ALTER TABLE user_progress_metrics 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;
