-- PHASE Y.6.4: MEMORY SYSTEM REPAIR (FINAL)
-- Fixes dimension limit error for 3072D Gemini embeddings using halfvec
-- Fixes signature mismatch by dropping existing function first

-- 1. Drop existing indexes
DROP INDEX IF EXISTS message_embeddings_embedding_idx;
DROP INDEX IF EXISTS idx_message_embeddings_vector;

-- 2. Alter column type (Preserves 32-bit precision in storage)
ALTER TABLE message_embeddings 
ALTER COLUMN embedding TYPE vector(3072);

-- 3. Create HNSW index using halfvec cast (Supports up to 4000 dimensions)
-- This allows indexing 3072 dimensions on standard 8KB pages
CREATE INDEX idx_message_embeddings_halfvec_hnsw ON message_embeddings 
USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);

-- 4. Drop existing function to avoid "cannot change return type" error
-- We use the specific signature that existed (1536)
DROP FUNCTION IF EXISTS match_messages(vector, float, int, uuid);

-- 5. Create the updated match_messages function
CREATE OR REPLACE FUNCTION match_messages (
  query_embedding vector(3072),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.message_id as id,
    me.content,
    -- Use halfvec cast to match the index for high performance
    1 - ((me.embedding::halfvec(3072)) <=> (query_embedding::halfvec(3072))) AS similarity
  FROM message_embeddings me
  WHERE me.user_id = p_user_id
    AND 1 - ((me.embedding::halfvec(3072)) <=> (query_embedding::halfvec(3072))) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
