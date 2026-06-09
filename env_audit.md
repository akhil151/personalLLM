# ENVIRONMENT AUDIT

## SUMMARY
Audit of environment variables in `.env.local` following provider consolidation.

## ACTIVE VARIABLES
These variables are required for the current runtime (Ollama, Groq, Supabase).

| Variable | Purpose | Status |
|----------|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase endpoint | KEEP |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public key | KEEP |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key | KEEP |
| `GROQ_API_KEY` | Secondary LLM Provider | KEEP |
| `OLLAMA_BASE_URL` | Primary LLM Provider Endpoint | KEEP |
| `OLLAMA_MODEL` | Primary LLM Model (qwen3:8b) | KEEP |

## UNUSED VARIABLES
These variables belong to decommissioned providers and are safe to remove.

| Variable | Provider | Status |
|----------|----------|--------|
| `OPENAI_API_KEY` | OpenAI | SAFE TO REMOVE |
| `GEMINI_API_KEY` | Gemini | SAFE TO REMOVE |
| `OPENROUTER_API_KEY` | OpenRouter | SAFE TO REMOVE |

## DUPLICATES
None found.

## DETERMINATION
- Remove `OPENAI_API_KEY`, `GEMINI_API_KEY`, and `OPENROUTER_API_KEY` from `.env.local`.
