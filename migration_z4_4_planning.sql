-- ==================================================
-- PHASE Z.4.4: CHIEF OF STAFF PLANNING INTELLIGENCE
-- Milestone Tasks, Dependencies, and Blockers
-- ==================================================

-- 1. Milestone Tasks (Granular execution items)
CREATE TABLE milestone_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES project_milestones(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    estimated_effort INTEGER, -- In hours or relative points
    order_index INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Project/Milestone Dependencies
CREATE TABLE project_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES user_projects(id) ON DELETE CASCADE,
    dependent_id UUID NOT NULL, -- ID of milestone or task that depends on another
    dependency_id UUID NOT NULL, -- ID of milestone or task that is required
    dependency_type TEXT NOT NULL CHECK (dependency_type IN ('milestone', 'task')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Project Blockers (Active execution impediments)
CREATE TABLE project_blockers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES user_projects(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES project_milestones(id) ON DELETE SET NULL,
    task_id UUID REFERENCES milestone_tasks(id) ON DELETE SET NULL,
    blocker_type TEXT NOT NULL, -- 'Stalled Progress', 'Dependency Blocked', 'Execution Failure'
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    recommendation TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Row Level Security
ALTER TABLE milestone_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_blockers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own milestone tasks" ON milestone_tasks FOR ALL 
USING (EXISTS (
    SELECT 1 FROM project_milestones pm
    JOIN user_projects up ON pm.project_id = up.id
    WHERE pm.id = milestone_tasks.milestone_id AND up.user_id = auth.uid()
));

CREATE POLICY "Users can manage own dependencies" ON project_dependencies FOR ALL 
USING (EXISTS (SELECT 1 FROM user_projects WHERE id = project_dependencies.project_id AND user_id = auth.uid()));

CREATE POLICY "Users can manage own blockers" ON project_blockers FOR ALL 
USING (EXISTS (SELECT 1 FROM user_projects WHERE id = project_blockers.project_id AND user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_milestone_tasks_milestone_id ON milestone_tasks(milestone_id);
CREATE INDEX idx_project_dependencies_project_id ON project_dependencies(project_id);
CREATE INDEX idx_project_blockers_project_id ON project_blockers(project_id);
CREATE INDEX idx_project_blockers_milestone_id ON project_blockers(milestone_id);
CREATE INDEX idx_project_blockers_task_id ON project_blockers(task_id);
