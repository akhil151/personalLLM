# DEAD CODE AUDIT REPORT
Date: 2026-06-07
Auditor: Principal Staff Engineer / Forensics Specialist

## OVERVIEW
An automated audit of the `src` directory was performed to identify active, dormant, and dead code based on usage patterns, content heuristics, and file naming conventions.

## STATISTICS
- **ACTIVE**: 104 files
- **DORMANT**: 7 files
- **DEAD**: 0 files

## CLASSIFICATION CRITERIA
- **ACTIVE**: Files in core directories (`agents`, `orchestrator`, `runtime`, `services`) with recent activity or core logic.
- **DORMANT**: Files containing `TODO`, `Mock`, or test-related suffixes that are not part of the production execution path.
- **DEAD**: Files with minimal content (< 100 characters) or abandoned boilerplate.

## AUDIT LOG

### DORMANT FILES
- [supabase-admin.ts](file:///c:/projects/LLM/src/lib/supabase-admin.ts): Administrative utility, used only in scripts and audits.
- [chaos_tester.ts](file:///c:/projects/LLM/src/tests/chaos_tester.ts): Test utility for resilience testing.
- [final_production_audit.ts](file:///c:/projects/LLM/src/tests/final_production_audit.ts): Pre-release audit script.
- [live_auth_test.ts](file:///c:/projects/LLM/src/tests/live_auth_test.ts): Manual authentication verification script.
- [mock_admin_client.ts](file:///c:/projects/LLM/src/tests/mock_admin_client.ts): Mocking utility for local development.

### ACTIVE CORE (SAMPLE)
- [plannerAgent.ts](file:///c:/projects/LLM/src/agents/planner/plannerAgent.ts): CRITICAL - Handles task decomposition.
- [orchestratorService.ts](file:///c:/projects/LLM/src/orchestrator/orchestratorService.ts): CRITICAL - Central execution brain.
- [workflowRuntime.ts](file:///c:/projects/LLM/src/runtime/workflowRuntime.ts): CRITICAL - State machine for workflows.
- [providerRouter.ts](file:///c:/projects/LLM/src/providers/providerRouter.ts): CRITICAL - LLM routing and failover.

## RECOMMENDATIONS
1. **Refactor**: Move `src/tests` to a root `tests` directory to clearly separate production code from audit/test code.
2. **Clean up**: Review dormant test files and archive those no longer relevant to the Z.4 roadmap.
