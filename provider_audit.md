# PROVIDER AUDIT

## SCOPE
This audit identifies all references to OpenAI, Gemini, and OpenRouter to ensure safe removal.

## FINDINGS

### OpenAI
| File | Import Path | Runtime Usage | Dependency Chain | Status |
|------|-------------|---------------|------------------|--------|
| `src/providers/OpenAIProvider.ts` | `LLMProvider` | Inactive | `providerRouter.ts` | SAFE TO DELETE |
| `src/services/openaiService.ts` | `openai`, `@ai-sdk/openai` | Inactive | Tests only | SAFE TO DELETE |
| `src/services/openaiResilienceService.ts` | - | Inactive | `openaiService.ts` | SAFE TO DELETE |
| `src/voice/voiceService.ts` | `ws` | Inactive | Tests only | SAFE TO DELETE |
| `src/services/systemHealthAudit.ts` | - | `checkOpenAI` | Runtime Startup | STILL REQUIRED (Update) |
| `src/providers/providerRouter.ts` | `@ai-sdk/openai` | Fallback logic | Runtime | STILL REQUIRED (Update) |

### Gemini
| File | Import Path | Runtime Usage | Dependency Chain | Status |
|------|-------------|---------------|------------------|--------|
| `src/providers/GeminiProvider.ts` | `LLMProvider` | Inactive | `providerRouter.ts` | SAFE TO DELETE |
| `src/tests/check_gemini_embed.ts` | - | Test only | - | SAFE TO DELETE |

### OpenRouter
| File | Import Path | Runtime Usage | Dependency Chain | Status |
|------|-------------|---------------|------------------|--------|
| `src/providers/OpenRouterProvider.ts` | `LLMProvider` | Inactive | `providerRouter.ts` | SAFE TO DELETE |

## DETERMINATION
- **OpenAI Provider**: Safe to delete after updating `providerRouter.ts` and `systemHealthAudit.ts`.
- **Gemini Provider**: Safe to delete after updating `providerRouter.ts`.
- **OpenRouter Provider**: Safe to delete after updating `providerRouter.ts`.
- **OpenAI Services**: Safe to delete as they are superseded by `llmService.ts`.
- **OpenAI Voice**: Safe to delete as UI uses `browserVoiceService.ts`.
