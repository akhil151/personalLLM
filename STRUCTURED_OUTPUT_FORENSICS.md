# STRUCTURED_OUTPUT_FORENSICS.md
Date: 2026-06-07
Auditor: Principal AI Architect / Forensics Engineer

## 1. INCIDENT SUMMARY
The Jarvis platform experienced critical runtime failures in the `PlannerAgent`, `ReflectionEngine`, and several core services. The error `schema.safeParse is not a function` was observed, leading to a total halt of the autonomous execution pipeline.

## 2. ROOT CAUSE ANALYSIS
The `llmService.getStructuredOutput()` method expects a `ZodSchema` as its second argument. However, multiple core components are passing either empty objects `{}` or raw JSON schema objects. 

When `safeJsonParser.parse()` receives these non-Zod objects, it attempts to invoke `schema.safeParse()`, which results in a runtime `TypeError`.

## 3. EVIDENCE TRACE

### Caller: PlannerAgent.ts
- **File**: `src/agents/planner/plannerAgent.ts`
- **Call Site**: Line 60
- **Actual Type**: `{}` (Empty Object)
- **Impact**: Planner fails to decompose goals into tasks.

### Caller: ReflectionEngine.ts
- **File**: `src/reflection/reflectionEngine.ts`
- **Call Site**: Line 38
- **Actual Type**: `{}` (Empty Object)
- **Impact**: Self-correction loop fails to evaluate task results.

### Caller: ToolService.ts
- **File**: `src/services/tools/toolService.ts`
- **Call Site**: Line 139 (summarize_conversation), Line 178 (generate_learning_plan)
- **Actual Type**: Raw JSON Schema objects.
- **Impact**: Summarization and learning plan generation are broken.

## 4. RECOMMENDATIONS
1. **Hardening**: Modify `llmService.getStructuredOutput()` to strictly validate that the provided schema is a Zod object using a new `isZodSchema()` utility.
2. **Refactoring**: Update all identified callers to use `zod` for schema definition.
3. **Fail-Fast**: Implement an immediate throw if a non-Zod schema is detected at the service boundary.
