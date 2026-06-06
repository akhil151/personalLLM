-- PHASE Z.3: PERSONAL INTELLIGENCE LAYER
-- This migration adds tables for User Profiling and Behavioral Analysis.

BEGIN;

-- 1. Jarvis User Profile
CREATE TABLE jarvis_user_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    current_focus TEXT,
    learning_goals TEXT[],
    career_goals TEXT[],
    preferred_domains TEXT[],
    preferred_tools TEXT[],
    active_projects TEXT[],
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Jarvis Behavior Profile
CREATE TABLE jarvis_behavior_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern_type TEXT NOT NULL, -- 'activity_frequency', 'work_pattern', 'preferred_time', 'completion_rate'
    pattern_value JSONB NOT NULL,
    confidence FLOAT DEFAULT 0.0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, pattern_type)
);

-- RLS
ALTER TABLE jarvis_user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE jarvis_behavior_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own jarvis user profile" ON jarvis_user_profile FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own jarvis behavior profile" ON jarvis_behavior_profile FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_jarvis_user_profile_user_id ON jarvis_user_profile(user_id);
CREATE INDEX idx_jarvis_behavior_profile_user_id ON jarvis_behavior_profile(user_id);

COMMIT;
