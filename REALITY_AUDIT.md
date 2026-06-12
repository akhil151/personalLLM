# REALITY AUDIT

## ENVIRONMENT FILES INSPECTED
- .env.local: Found ✓
- .env: Not found
- .env.production: Not found

## ACTIVE VALUES
| Key | Value | Status |
|-----|-------|--------|
| USE_MOCK_SUPABASE | false | REAL ✓ |
| USE_MOCK_LLM | false | REAL ✓ |
| NEXT_PUBLIC_SUPABASE_URL | [REDACTED] | PRESENT ✓ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | [REDACTED] | PRESENT ✓ |
| SUPABASE_SERVICE_ROLE_KEY | [REDACTED] | PRESENT ✓ |
| GROQ_API_KEY | [REDACTED] | PRESENT ✓ |
| OLLAMA_BASE_URL | http://localhost:11434 | PRESENT ✓ |
| OLLAMA_MODEL | qwen3:8b | PRESENT ✓ |
| OLLAMA_EMBED_MODEL | nomic-embed-text | PRESENT ✓ |

## MISSING VALUES
None ✓

## MOCK VALUES
None ✓ (USE_MOCK_SUPABASE=false, USE_MOCK_LLM=false)

## INVALID VALUES
None ✓

## FAILURE CONDITIONS CHECK
- USE_MOCK_SUPABASE=true: NO ✓
- USE_MOCK_LLM=true: NO ✓
- GROQ_API_KEY missing: NO ✓
- Supabase keys missing: NO ✓
