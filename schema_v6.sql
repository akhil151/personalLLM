-- PHASE 6: Browser Execution + Multimodal Perception + Knowledge Graph Schema

-- 1. Browser Sessions
CREATE TABLE browser_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workflow_run_id UUID REFERENCES workflow_runs(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('active', 'closed', 'paused')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Browser Actions (Operational Trace)
CREATE TABLE browser_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES browser_sessions(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'navigate', 'click', 'type', 'scroll', 'screenshot'
    selector TEXT,
    payload JSONB,
    screenshot_url TEXT, -- Path to stored screenshot in storage
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Page Snapshots (Visual Context)
CREATE TABLE page_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES browser_sessions(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    dom_snapshot_url TEXT, -- Path to stored DOM JSON
    screenshot_url TEXT,
    perception_data JSONB, -- AI-generated understanding of the page
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 4. Knowledge Graph: Entities
CREATE TABLE kg_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'person', 'organization', 'project', 'skill', 'topic'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, name, entity_type)
);

-- 5. Knowledge Graph: Relationships
CREATE TABLE kg_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_id UUID REFERENCES kg_entities(id) ON DELETE CASCADE,
    target_id UUID REFERENCES kg_entities(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL, -- 'member_of', 'works_on', 'relates_to', 'knows'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, source_id, target_id, relationship_type)
);

-- Row Level Security
ALTER TABLE browser_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE kg_relationships ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own browser sessions" ON browser_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own browser actions" ON browser_actions FOR ALL 
USING (EXISTS (SELECT 1 FROM browser_sessions WHERE id = browser_actions.session_id AND user_id = auth.uid()));
CREATE POLICY "Users can manage own page snapshots" ON page_snapshots FOR ALL 
USING (EXISTS (SELECT 1 FROM browser_sessions WHERE id = page_snapshots.session_id AND user_id = auth.uid()));
CREATE POLICY "Users can manage own KG entities" ON kg_entities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own KG relationships" ON kg_relationships FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_browser_actions_session_id ON browser_actions(session_id);
CREATE INDEX idx_page_snapshots_url ON page_snapshots(url);
CREATE INDEX idx_kg_entities_type ON kg_entities(entity_type);
CREATE INDEX idx_kg_relationships_source ON kg_relationships(source_id);
CREATE INDEX idx_kg_relationships_target ON kg_relationships(target_id);
