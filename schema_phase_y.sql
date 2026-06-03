-- AI PLATFORM: PHASE Y SCHEMA (MCP + VOICE + COLLABORATION)

-- ==================================================
-- 1. MCP ECOSYSTEM (Model Context Protocol)
-- ==================================================

CREATE TABLE mcp_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    transport_type TEXT NOT NULL CHECK (transport_type IN ('stdio', 'sse')),
    command TEXT,
    args TEXT[],
    env JSONB DEFAULT '{}'::jsonb,
    url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ==================================================
-- 2. VOICE RUNTIME (OpenAI Realtime API)
-- ==================================================

CREATE TABLE voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    session_config JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'interrupted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ==================================================
-- 3. COLLABORATIVE MULTI-AGENT RUNTIME
-- ==================================================

-- Agent-to-Agent Communication
CREATE TABLE agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    sender_agent TEXT NOT NULL,
    receiver_agent TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enhanced HITL (Human-in-the-Loop)
CREATE TABLE collaboration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    request_type TEXT NOT NULL, -- 'approval', 'input', 'review'
    payload JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ==================================================
-- 4. ANALYTICS & MODEL ROUTING
-- ==================================================

CREATE TABLE token_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
    model_name TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ==================================================
-- 5. RLS & INDEXES
-- ==================================================

ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read active MCP servers" ON mcp_servers FOR SELECT USING (is_active = true);
CREATE POLICY "Users can manage own voice sessions" ON voice_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view agent messages for their runs" ON agent_messages FOR SELECT 
USING (EXISTS (SELECT 1 FROM agent_runs WHERE id = agent_messages.run_id AND user_id = auth.uid()));
CREATE POLICY "Users can manage collaboration requests for their runs" ON collaboration_requests FOR ALL 
USING (EXISTS (SELECT 1 FROM agent_runs WHERE id = collaboration_requests.run_id AND user_id = auth.uid()));
CREATE POLICY "Users can view own token usage" ON token_usage FOR SELECT USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_agent_messages_run_id ON agent_messages(run_id);
CREATE INDEX idx_collaboration_requests_run_id ON collaboration_requests(run_id);
CREATE INDEX idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX idx_token_usage_run_id ON token_usage(run_id);
