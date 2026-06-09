# CLEANUP AUDIT

## SUMMARY
This audit evaluates the codebase for dead code, unused providers, and obsolete configurations following the migration to Ollama (Primary) and Groq (Secondary).

## CLASSIFICATION

### ACTIVE
Currently used by the runtime.

| File Path | Imported By | Imports Used | Safe to Remove | Reason |
|-----------|-------------|--------------|----------------|--------|
| `src/providers/LLMProvider.ts` | All providers | - | FALSE | Base interface for LLM providers. |
| `src/providers/OllamaProvider.ts` | `providerRouter.ts` | `LLMProvider` | FALSE | Primary LLM provider. |
| `src/providers/GroqProvider.ts` | `providerRouter.ts` | `LLMProvider` | FALSE | Secondary LLM provider. |
| `src/providers/providerRouter.ts` | `llmService.ts`, `embeddingService.ts` | `OllamaProvider`, `GroqProvider`, etc. | FALSE | Core routing logic. |
| `src/services/llmService.ts` | Agents, API routes | `providerRouter` | FALSE | Main entry point for LLM tasks. |
| `src/services/memory/embeddingService.ts` | `memoryService.ts` | `providerRouter` | FALSE | Handles vector embeddings. |
| `src/orchestrator/orchestratorService.ts` | API routes | `llmService` | FALSE | Coordinates agent activities. |
| `src/agents/*.ts` | Orchestrator | `llmService` | FALSE | Core AI logic. |

### LEGACY
Unused but preserved intentionally for reference or future use.

| File Path | Imported By | Safe to Remove | Reason |
|-----------|-------------|----------------|--------|
| `src/services/openaiResilienceService.ts` | `openaiService.ts` | TRUE | Specific to OpenAI, logic partially covered by `providerRouter`. |
| `src/tests/check_gemini_embed.ts` | - | TRUE | One-off test for Gemini embeddings. |

### DEAD
Not referenced anywhere or only referenced by other DEAD files.

| File Path | Imported By | Safe to Remove | Reason |
|-----------|-------------|----------------|--------|
| `src/providers/OpenAIProvider.ts` | `providerRouter.ts` (inactive) | TRUE | OpenAI is no longer used. |
| `src/providers/GeminiProvider.ts` | `providerRouter.ts` (inactive) | TRUE | Gemini is no longer used. |
| `src/providers/OpenRouterProvider.ts` | `providerRouter.ts` (inactive) | TRUE | OpenRouter is no longer used. |
| `src/services/openaiService.ts` | `production_readiness_certification.ts` | TRUE | Replaced by `llmService.ts`. |
| `src/services/openaiResilienceService.ts` | `openaiService.ts` | TRUE | Only used by DEAD `openaiService.ts`. |
| `src/tests/provider_audit.ts` | - | TRUE | Replaced by current audit. |
| `src/tests/resilience_test.ts` | - | TRUE | Tests OpenAI resilience which is DEAD. |
