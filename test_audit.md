# TEST SUITE AUDIT

## SUMMARY
Audit of all certification and test files.

## CLASSIFICATION

| File Path | Classification | Action | Reason |
|-----------|----------------|--------|--------|
| `src/tests/certification_suite.ts` | KEEP | NONE | Main production verification suite. |
| `src/tests/certification_full_agent.ts` | KEEP | NONE | End-to-end agent verification. |
| `src/tests/certification_failover.ts` | KEEP | NONE | Critical for verifying Ollama -> Groq failover. |
| `src/tests/certification_ollama_performance.ts` | KEEP | NONE | Performance tracking for primary provider. |
| `src/tests/production_readiness_certification.ts` | KEEP | UPDATE | Remove `openaiService` dependency. |
| `src/tests/systemHealthAudit.ts` | KEEP | NONE | Startup health check. |
| `src/tests/browser_agent_validation.ts` | KEEP | NONE | Browser automation verification. |
| `src/tests/certification_y65.ts` | ARCHIVE | MOVE | Historical phase Y documentation. |
| `src/tests/reality_certification.ts` | ARCHIVE | MOVE | Historical validation. |
| `src/tests/check_gemini_embed.ts` | DELETE | REMOVE | Gemini is no longer used. |
| `src/tests/resilience_test.ts` | DELETE | REMOVE | Specific to OpenAI resilience. |
| `src/tests/provider_audit.ts` | DELETE | REMOVE | Obsolete audit script. |
| `src/tests/chaos_tester.ts` | KEEP | UPDATE | Update Suite C to use `providerRouter` instead of `openaiResilience`. |

## DETERMINATION
- **Update**: `production_readiness_certification.ts`, `chaos_tester.ts`.
- **Delete**: `check_gemini_embed.ts`, `resilience_test.ts`, `provider_audit.ts`.
- **Archive**: Move `certification_y65.ts`, `reality_certification.ts` to `archive/` (or just leave them if not explicitly asked to move, but I'll mark them ARCHIVE).
