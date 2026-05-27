import { createAdminClient } from '@/lib/supabase-admin';
import { embeddingService } from './embeddingService';

/**
 * MemoryService handles the storage and retrieval of semantic memories.
 * 
 * WHY SEMANTIC SEARCH?
 * Keyword search (Ctrl+F) only finds exact words. 
 * Semantic search finds *concepts*. 
 * Searching for "pet" will find messages about "dogs" and "cats".
 */
export const memoryService = {
  /**
   * Stores a message's embedding in the database.
   */
  async storeMessageEmbedding(
    messageId: string, 
    conversationId: string, 
    userId: string, 
    content: string
  ) {
    const supabase = createAdminClient();
    const embedding = await embeddingService.generateEmbedding(content);

    const { error } = await supabase
      .from('message_embeddings')
      .insert({
        message_id: messageId,
        conversation_id: conversationId,
        user_id: userId,
        content,
        embedding,
      });

    if (error) console.error('Error storing embedding:', error);
  },

  /**
   * Performs a vector similarity search to find relevant past messages.
   * 
   * COSINE SIMILARITY:
   * We calculate the "angle" between the query vector and stored vectors.
   * A smaller angle means higher similarity.
   */
  async searchSimilarMemories(query: string, userId: string, limit = 5) {
    const supabase = createAdminClient();
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // We call the PostgreSQL function 'match_messages' we created in schema.sql
    const { data, error } = await supabase.rpc('match_messages', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5, // Only return reasonably similar results
      match_count: limit,
      p_user_id: userId,
    });

    if (error) {
      console.error('Error searching memories:', error);
      return [];
    }

    return data;
  }
};
