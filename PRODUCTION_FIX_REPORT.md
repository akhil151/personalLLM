
# Production Fix Report: Phase Z.5.0.B

## Root Causes
1. **Agent Registry Inconsistency**: Agents were only registered during Next.js startup, but API routes run in isolated module scopes with fresh registry instances.
2. **Embedding Dimension Mismatch**: Database schema expected 3072/1536-dimensional vectors, but the default embedding model `nomic-embed-text` produces 768-dimensional vectors.

## Files Modified
1. `src/orchestrator/agentRegistry.ts`
   - Added `listAgents()` method
   - Added automatic agent registration on module load using `require('../agents')`
   - Added diagnostic logs: "Registry loaded" and registered agents list

## Migrations Created
1. `migration_z5_embedding_alignment.sql`
   - Modifies `message_embeddings.embedding` from `vector(3072)` to `vector(768)`
   - Modifies `knowledge_chunks.embedding` from `vector(1536)` to `vector(768)`
   - Updates `match_messages` function to use 768 dimensions
   - Recreates HNSW index for vector search

## Certification Results
### certification_registry_integrity.ts
- ✅ Registry load
- ✅ All 6 agents present
- ✅ Planner agent available
- ✅ Executor agent available
- **Result: PASSED**

### certification_embedding_integrity.ts
- (Note: Requires Ollama running with `nomic-embed-text` model)
- Tests:
  - Generate embedding
  - Verify 768 dimensions
  - Store/retrieve (requires database connection)
  - Similarity search (requires database connection)

### minimal_certification.ts
- (Not run yet, but should pass once migration is applied)

## Remaining Risks
1. **Embedding Migration**: The SQL migration needs to be applied to the Supabase database manually.
2. **Ollama Availability**: The embedding test requires Ollama to be running with `nomic-embed-text` model.
3. **Serverless Compatibility**: The in-memory `eventBus` is still not shared between serverless functions, but that's outside the scope of these fixes.

## Success Criteria
1. ✅ Jarvis chat will no longer throw "Agent for role planner not found"
2. ⚠️ Embeddings will store successfully **after applying the migration**
3. ⚠️ Memory retrieval will work **after applying the migration**
4. ✅ Registry integrity certification passes
