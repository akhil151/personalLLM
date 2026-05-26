-- PHASE 7: ADAPTIVE LEARNING + COGNITIVE EVOLUTION ENGINE SCHEMA

-- 1. Reinforcement Feedback Architecture
CREATE TABLE feedback_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    run_id UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- 'approval', 'rejection', 'correction', 'execution_success', 'execution_failure'
    source TEXT NOT NULL, -- 'user', 'system', 'meta-critic'
    content JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE learning_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feedback_event_id UUID REFERENCES feedback_events(id) ON DELETE CASCADE,
    reward_score FLOAT NOT NULL, -- Normalized score e.g. -1.0 to 1.0
    context TEXT NOT NULL, -- e.g. 'planning', 'tool_use', 'communication'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE behavioral_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL, -- 'frequency', 'latency', 'retry_rate', 'success_rate'
    value JSONB NOT NULL,
    context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE adaptation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    adaptation_type TEXT NOT NULL, -- 'strategy_update', 'preference_shift', 'skill_acquisition'
    old_state JSONB,
    new_state JSONB NOT NULL,
    reasoning TEXT,
    impact_score FLOAT, -- Measured impact after adaptation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Longitudinal User Modeling
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    cognitive_style TEXT,
    communication_preferences JSONB DEFAULT '{}'::jsonb,
    productivity_patterns JSONB DEFAULT '{}'::jsonb,
    expertise_areas TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE behavior_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern_type TEXT NOT NULL, -- 'workflow', 'interaction', 'timing'
    description TEXT NOT NULL,
    confidence FLOAT NOT NULL,
    frequency INTEGER DEFAULT 1,
    last_observed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE goal_evolution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_text TEXT NOT NULL,
    status TEXT NOT NULL, -- 'active', 'achieved', 'abandoned', 'evolved'
    evolution_path UUID[], -- Array of goal IDs showing how this goal evolved
    priority_weight FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE interaction_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- 'tone', 'detail_level', 'proactivity'
    preference_value JSONB NOT NULL,
    strength FLOAT NOT NULL, -- 0.0 to 1.0
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, category)
);

-- 3. Autonomous Skill Acquisition
CREATE TABLE learned_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    competence_level FLOAT DEFAULT 0.0,
    usage_count INTEGER DEFAULT 0,
    success_rate FLOAT DEFAULT 0.0,
    definition JSONB NOT NULL, -- The executable logic or prompt template
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    structure JSONB NOT NULL,
    optimized_at TIMESTAMP WITH TIME ZONE,
    avg_performance_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE execution_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_hash TEXT NOT NULL,
    steps_sequence JSONB NOT NULL,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_latency_ms INTEGER,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE operational_playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    context_trigger TEXT NOT NULL, -- Semantic description of when to use
    actions_list JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Row Level Security
ALTER TABLE feedback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_evolution ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE learned_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own feedback" ON feedback_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own rewards" ON learning_rewards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own signals" ON behavioral_signals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own adaptation history" ON adaptation_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own profile" ON user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own patterns" ON behavior_patterns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own goals" ON goal_evolution FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own interaction preferences" ON interaction_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own skills" ON learned_skills FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own workflow templates" ON workflow_templates FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_feedback_events_user_id ON feedback_events(user_id);
CREATE INDEX idx_learning_rewards_event_id ON learning_rewards(feedback_event_id);
CREATE INDEX idx_behavioral_signals_user_id ON behavioral_signals(user_id);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_learned_skills_user_id ON learned_skills(user_id);
CREATE INDEX idx_workflow_templates_user_id ON workflow_templates(user_id);
