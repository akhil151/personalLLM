-- PHASE 5: Durable Workflow Runtime & Event-Driven Architecture Schema

-- 1. Workflow Runs (Durable execution state)
CREATE TABLE workflow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    workflow_type TEXT NOT NULL, -- e.g., 'agent_orchestration', 'knowledge_ingestion'
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused', 'recovered')),
    current_state JSONB DEFAULT '{}'::jsonb, -- Snapshot of current variables
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Workflow Events (Event-driven history)
CREATE TABLE workflow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_run_id UUID REFERENCES workflow_runs(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- e.g., 'TASK_CREATED', 'PLAN_GENERATED', 'TOOL_EXECUTED'
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Workflow Snapshots (Checkpointing for recovery)
CREATE TABLE workflow_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_run_id UUID REFERENCES workflow_runs(id) ON DELETE CASCADE,
    state_data JSONB NOT NULL,
    step_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 4. Background Jobs (Distributed Queue)
CREATE TABLE background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workflow_run_id UUID REFERENCES workflow_runs(id) ON DELETE SET NULL,
    job_type TEXT NOT NULL, -- e.g., 'research', 'embedding_generation'
    payload JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'retrying')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_log TEXT,
    next_run_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 5. Knowledge Documents (RAG expansion)
CREATE TABLE knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL, -- 'pdf', 'url', 'text', 'markdown'
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'indexed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 6. Knowledge Chunks & Embeddings
CREATE TABLE knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536), -- Assuming OpenAI 1536-dim embeddings
    chunk_index INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 7. Autonomous Schedules (Proactive AI)
CREATE TABLE autonomous_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cron_expression TEXT, -- For recurring tasks
    next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
    workflow_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 8. Execution Safety Logs
CREATE TABLE safety_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workflow_run_id UUID REFERENCES workflow_runs(id) ON DELETE SET NULL,
    violation_type TEXT NOT NULL, -- 'recursion_limit', 'cost_limit', 'timeout'
    details TEXT,
    action_taken TEXT, -- 'blocked', 'warned'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Row Level Security
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own workflow runs" ON workflow_runs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage events of own runs" ON workflow_events FOR ALL 
USING (EXISTS (SELECT 1 FROM workflow_runs WHERE id = workflow_events.workflow_run_id AND user_id = auth.uid()));
CREATE POLICY "Users can manage snapshots of own runs" ON workflow_snapshots FOR ALL 
USING (EXISTS (SELECT 1 FROM workflow_runs WHERE id = workflow_snapshots.workflow_run_id AND user_id = auth.uid()));
CREATE POLICY "Users can manage own background jobs" ON background_jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own knowledge docs" ON knowledge_documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage chunks of own docs" ON knowledge_chunks FOR ALL 
USING (EXISTS (SELECT 1 FROM knowledge_documents WHERE id = knowledge_chunks.document_id AND user_id = auth.uid()));
CREATE POLICY "Users can manage own schedules" ON autonomous_schedules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own safety logs" ON safety_logs FOR SELECT USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_workflow_runs_user_id ON workflow_runs(user_id);
CREATE INDEX idx_background_jobs_status ON background_jobs(status);
CREATE INDEX idx_knowledge_chunks_document_id ON knowledge_chunks(document_id);
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_autonomous_schedules_next_run ON autonomous_schedules(next_run_at);
