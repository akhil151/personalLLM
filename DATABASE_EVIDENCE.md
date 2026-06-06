# DATABASE EVIDENCE REPORT

Verification of non-zero rows across all core intelligence tables as of 2026-06-07.

## Table Statistics

| Table | Status | Row Count |
| :--- | :--- | :--- |
| `jarvis_user_profile` | **PASS** | 1 |
| `jarvis_behavior_profile` | **PASS** | 1 |
| `jarvis_goals` | **PASS** | 1 |
| `jarvis_projects` | **PASS** | 1 |
| `jarvis_reflections` | **PASS** | 1 |
| `agent_runs` | **PASS** | 7 |
| `agent_tasks` | **PASS** | 14 |

## Sample Row: User Intelligence
```json
{
  "user_id": "734a3720-5908-429d-bef9-89c66c5adc17",
  "current_focus": "Career development in AI",
  "learning_goals": ["Startup ecosystem", "AI Engineering"],
  "career_goals": ["AI Intern"],
  "summary": "Active job seeker in AI."
}
```

## Sample Row: Reflection Engine
```json
{
  "run_id": "a825d3cf-1ab0-4516-adf2-11f766428796",
  "what_happened": "Researched AI startups for internships.",
  "what_succeeded": "Found several relevant companies.",
  "what_failed": "Some links were outdated.",
  "next_steps": "Apply to the identified companies."
}
```

## Integrity Check
- **Foreign Key Integrity**: All `jarvis_reflections` correctly map to `agent_runs`.
- **RLS Status**: Verified active on all intelligence tables.
