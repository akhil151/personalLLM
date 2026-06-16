-- Migration: Add browser_logs table
-- Purpose: Store browser execution logs for debugging and observability

CREATE TABLE IF NOT EXISTS browser_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  run_id UUID,
  session_id UUID,
  log_level TEXT NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_run FOREIGN KEY (run_id) REFERENCES agent_runs(id) ON DELETE SET NULL,
  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES browser_sessions(id) ON DELETE SET NULL
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_browser_logs_user_id ON browser_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_browser_logs_run_id ON browser_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_browser_logs_session_id ON browser_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_browser_logs_created_at ON browser_logs(created_at DESC);

-- Enable row level security
ALTER TABLE browser_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (only allow users to access their own logs)
CREATE POLICY "Users can view their own browser logs"
  ON browser_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for service role (our worker can write logs)
CREATE POLICY "Service role can manage browser logs"
  ON browser_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Retention: Clean up old logs after 30 days
-- Create a trigger or use Supabase's pg_cron if available
-- For now, we'll handle cleanup in code
