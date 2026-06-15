
-- ==================================================
-- PHASE Z.5.0.B: EMBEDDING DIMENSION ALIGNMENT
-- ==================================================

-- Step 1: Drop existing vector index
DROP INDEX IF EXISTS idx_message_embeddings_vector;

-- Step 2: Clear existing data (since we're changing embedding dimensions)
TRUNCATE TABLE message_embeddings CASCADE;
TRUNCATE TABLE knowledge_chunks CASCADE;

-- Step 3: Modify message_embeddings.embedding from 3072 to 768
ALTER TABLE message_embeddings 
ALTER COLUMN embedding TYPE vector(768);

-- Step 4: Modify knowledge_chunks.embedding from 1536 to 768
ALTER TABLE knowledge_chunks 
ALTER COLUMN embedding TYPE vector(768);

-- Step 5: Recreate vector index
CREATE INDEX idx_message_embeddings_vector 
ON message_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- Step 6: Update or recreate match_messages function
DROP FUNCTION IF EXISTS match_messages(vector, float, int, uuid);

CREATE OR REPLACE FUNCTION match_messages(
    query_embedding vector(768),
    match_threshold float,
    match_count int,
    p_user_id uuid
)
RETURNS TABLE (
    id uuid,
    message_id uuid,
    content text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        me.id,
        me.message_id,
        me.content,
        1 - (me.embedding <=> query_embedding) AS similarity
    FROM message_embeddings me
    WHERE
        me.user_id = p_user_id
        AND 1 - (me.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- ==================================================
-- Migration Complete
-- ==================================================
