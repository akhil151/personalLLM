-- PHASE Z.2: PROACTIVE INTELLIGENCE LAYER
-- This migration adds tables for Goal Management, Project Tracking, and AI Reflections.

BEGIN;

-- 1. Jarvis Goals
CREATE TABLE jarvis_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'blocked')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Jarvis Projects
CREATE TABLE jarvis_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('planning', 'active', 'completed', 'on_hold')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Jarvis Reflections
CREATE TABLE jarvis_reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
    what_happened TEXT NOT NULL,
    what_succeeded TEXT NOT NULL,
    what_failed TEXT NOT NULL,
    next_steps TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE jarvis_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own jarvis goals" ON jarvis_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own jarvis projects" ON jarvis_projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own jarvis reflections" ON jarvis_reflections FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_jarvis_goals_user_id ON jarvis_goals(user_id);
CREATE INDEX idx_jarvis_projects_user_id ON jarvis_projects(user_id);
CREATE INDEX idx_jarvis_reflections_run_id ON jarvis_reflections(run_id);

COMMIT;
