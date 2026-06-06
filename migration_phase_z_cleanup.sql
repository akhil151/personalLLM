-- PHASE Z: ARCHITECTURE CLEANUP MIGRATION
-- This script removes legacy and unimplemented tables identified as DEAD.
-- These tables have zero codebase references and are not part of the core runtime.

BEGIN;

DROP TABLE IF EXISTS adaptation_history CASCADE;
DROP TABLE IF EXISTS behavior_patterns CASCADE;
DROP TABLE IF EXISTS behavioral_signals CASCADE;
DROP TABLE IF EXISTS goal_evolution CASCADE;
DROP TABLE IF EXISTS learned_skills CASCADE;
DROP TABLE IF EXISTS learning_rewards CASCADE;
DROP TABLE IF EXISTS execution_patterns CASCADE;
DROP TABLE IF EXISTS operational_playbooks CASCADE;

COMMIT;
