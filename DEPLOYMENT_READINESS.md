# Deployment Readiness

## Required Environment Variables

| Variable | Required? | Purpose | Example Value |
|----------|-----------|---------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key | `eyJhbGc...` |
| `OLLAMA_BASE_URL` | Yes | Ollama server URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Yes | Default Ollama chat model | `llama3.2:3b` or `qwen3:8b` |
| `OLLAMA_EMBED_MODEL` | Yes | Ollama embedding model | `nomic-embed-text` |
| `GROQ_API_KEY` | No (fallback) | Groq API key for LLM fallback | `gsk_...` |

## Required Database Migrations

Run all migrations in order:

1. `migration_p1_collaboration_tasks.sql`
2. `migration_p2_scheduler_and_recovery.sql`
3. Any other `migration_*.sql` files in root

## Required Ollama Models

Pull these models before starting:

```bash
ollama pull nomic-embed-text  # REQUIRED - Embedding model
ollama pull qwen3:8b          # Default chat model (or your preferred model)

# Optional vision model
ollama pull llava:latest      # Or qwen-vl, etc.
```

## Required Services

- **Supabase PostgreSQL DB**: For all state storage
- **Ollama**: For LLM and embedding generation
- **Next.js**: The web server

## Startup Sequence

1. Check that all required env vars are present
2. Check that Supabase DB is reachable
3. Check that Ollama server is reachable
4. Validate that required Ollama models are available
5. Start worker runtime (event dispatcher + background worker)
6. Start Next.js server

## Deployment Checklist

- [ ] All required env vars are configured in production environment
- [ ] All DB migrations applied successfully
- [ ] All required Ollama models are pulled on production server
- [ ] Supabase RLS policies are configured correctly
- [ ] Health check endpoint is accessible
- [ ] Logging and monitoring are set up
- [ ] Backup strategy for DB is in place
- [ ] Worker is set up to run as a background service (systemd/pm2)
- [ ] SSL/TLS is configured for Next.js server
- [ ] CORS is set up correctly for Supabase and Ollama
- [ ] File upload storage (if needed) is configured in Supabase
