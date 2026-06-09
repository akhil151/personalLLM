-- ==================================================
-- PHASE Z.4.3: CHIEF OF STAFF INTELLIGENCE LAYER
-- Goals, Projects, Milestones, and Recommendations
-- ==================================================

-- 1. Goals (The high-level user intent)
CREATE TABLE user_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'stalled', 'cancelled')) DEFAULT 'active',
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    metadata JSONB DEFAULT '{}'::jsonb,
    target_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Projects (Goals converted into manageable units)
CREATE TABLE user_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES user_goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')) DEFAULT 'active',
    health_state TEXT NOT NULL CHECK (health_state IN ('green', 'yellow', 'red')) DEFAULT 'green',
    current_phase TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Milestones (Breakdown of project/goal)
CREATE TABLE project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES user_projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')) DEFAULT 'pending',
    order_index INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    target_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 4. Recommendations (Proactive guidance)
CREATE TABLE jarvis_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES user_goals(id) ON DELETE SET NULL,
    project_id UUID REFERENCES user_projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    impact TEXT NOT NULL,
    urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'dismissed', 'completed')) DEFAULT 'pending',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 5. Progress Metrics (For analytics and trends)
CREATE TABLE user_progress_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_date DATE DEFAULT CURRENT_DATE NOT NULL,
    active_goals_count INTEGER DEFAULT 0,
    active_projects_count INTEGER DEFAULT 0,
    completed_tasks_count INTEGER DEFAULT 0,
    project_velocity FLOAT DEFAULT 0.0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, metric_date)
);

-- Row Level Security
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress_metrics ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own goals" ON user_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own projects" ON user_projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own milestones" ON project_milestones FOR ALL 
USING (EXISTS (SELECT 1 FROM user_projects WHERE id = project_milestones.project_id AND user_id = auth.uid()));
CREATE POLICY "Users can manage own recommendations" ON jarvis_recommendations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own metrics" ON user_progress_metrics FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX idx_user_projects_user_id ON user_projects(user_id);
CREATE INDEX idx_user_projects_goal_id ON user_projects(goal_id);
CREATE INDEX idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX idx_jarvis_recommendations_user_id ON jarvis_recommendations(user_id);
CREATE INDEX idx_user_progress_metrics_user_id ON user_progress_metrics(user_id);
