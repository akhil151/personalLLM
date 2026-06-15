
# Architecture Bug Report

## Issue 1: Agent Registry Inconsistency

### Root Cause
The application uses Next.js with serverless functions, which means each API request runs in its own isolated module scope. The agent registry (`agentRegistry` in `src/orchestrator/agentRegistry.ts`) is a singleton exported from that module, but:

1. The agents are registered in `src/instrumentation.ts` (runs on Next.js startup, in the main Node.js process)
2. API routes (like `src/app/api/chat/route.ts`) import `agentRegistry` and `executionPipeline` directly
3. Each serverless function gets a **fresh module instance**, so the `agentRegistry` in API routes is **empty** (no agents registered)

This leads to the error: "Agent for role planner not found in registry."

### Reproduction Path
1. Start the Next.js server
2. Observe startup logs: "Planner Agent registered", "Memory Agent registered", etc.
3. Make an API request to `/api/chat`
4. The API route tries to dispatch to "planner" agent via `orchestratorService.dispatch()`
5. The `agentRegistry` instance in the API route's module scope has no agents, so it throws the error

### Files Affected
- `src/orchestrator/agentRegistry.ts`
- `src/instrumentation.ts`
- `src/app/api/chat/route.ts`
- `src/agents/index.ts`

### Severity
CRITICAL - The entire multi-agent system is non-functional in API routes.

### Recommended Fix
Ensure agents are registered **every time the module is imported**, not just in `instrumentation.ts`. This way, no matter which process/module scope loads `agentRegistry`, the agents are always present.

We can do this by moving the agent registration to the `agentRegistry.ts` module itself, or by ensuring that importing `agentRegistry` automatically registers all agents.

### Risk Assessment
Low risk - The fix is straightforward and maintains backward compatibility.


## Issue 2: Embedding Dimension Mismatch

### Root Cause
1. Database schema (`schema_phase_z.sql`) defines `message_embeddings.embedding` as `vector(3072)` (3072 dimensions)
2. `knowledge_chunks.embedding` is defined as `vector(1536)` (1536 dimensions)
3. The default embedding model is `nomic-embed-text` (from OllamaProvider), which produces **768-dimensional vectors**

This causes errors when storing/retrieving embeddings.

### Reproduction Path
1. A message is sent, triggering embedding generation
2. `embeddingService.generateEmbedding()` calls Ollama's `nomic-embed-text`
3. It receives a 768-dimensional vector
4. It tries to store this in `message_embeddings` which expects 3072 dimensions
5. The database throws an error

### Files Affected
- `src/services/memory/embeddingService.ts`
- `src/services/memory/memoryService.ts`
- `src/providers/OllamaProvider.ts`
- `schema_phase_z.sql`

### Severity
HIGH - Semantic search and memory features are broken.

### Recommended Fix
**Option 1 (Recommended):** Update the database schema to use 768 dimensions for all vector columns (matches `nomic-embed-text`).

- Update `message_embeddings.embedding` from `vector(3072)` to `vector(768)`
- Update `knowledge_chunks.embedding` from `vector(1536)` to `vector(768)`
- Update the `match_messages` PostgreSQL function to use 768 dimensions

**Option 2:** Switch to an embedding model that produces 3072-dimensional vectors (e.g., OpenAI's `text-embedding-3-large`).

### Risk Assessment
Option 1: Medium risk (requires database migration, but straightforward). Option 2: Low risk (just change embedding model, but may incur costs).


## Issue 3: Startup vs Runtime State

### Root Cause
Next.js has two distinct execution environments:
1. **Main process:** Runs `instrumentation.ts` on startup, initializes worker runtime, event dispatcher, etc.
2. **Serverless functions:** Each API route runs in its own isolated environment, with fresh module instances.

Stateful singletons (like `agentRegistry`, `eventBus`, `jobQueue`) are not shared between these environments.

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Main Process                      │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ instrumentation  │  │  Worker Runtime  │                │
│  │   (registers     │  │  (background     │                │
│  │   agents)        │  │   jobs)          │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
         │
         │ (Isolated)
         ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Route (Serverless)                     │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  agentRegistry   │  │ executionPipeline│                │
│  │   (empty!)       │  │                  │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### Files Affected
- All stateful singletons:
  - `src/orchestrator/agentRegistry.ts`
  - `src/events/eventBus.ts`
  - `src/queue/jobQueue.ts`
  - `src/runtime/workflowRuntime.ts`

### Severity
CRITICAL - The system is architecturally flawed for serverless deployment.

### Recommended Fix
For Next.js serverless deployment:
1. **Move all stateful logic to the database** (e.g., agent registry could be a database table, but in this case, since agents are code, we need to ensure they're registered everywhere)
2. **Ensure all modules register agents on import** (fix for Issue 1)
3. **Use a shared event bus** (e.g., Redis Pub/Sub) instead of in-memory `eventBus`
4. **Use database-backed queues** (already using `background_jobs` table, good!)

### Risk Assessment
High - Requires significant architectural changes for full serverless compatibility, but the immediate fix (Issue 1) is simple.
