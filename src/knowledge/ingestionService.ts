import { createClient } from '@/lib/supabase-server';
import { chunkingService } from './chunkingService';
import { embeddingService } from '@/services/memory/embeddingService';

/**
 * IngestionService manages the knowledge pipeline.
 * 
 * THE PIPELINE:
 * 1. Upload -> Save document metadata.
 * 2. Parse -> Extract text (PDF, Markdown, etc.).
 * 3. Chunk -> Split into small pieces.
 * 4. Embed -> Generate vector representations.
 * 5. Store -> Save chunks and embeddings to pgvector.
 */
export const ingestionService = {
  async ingestDocument(userId: string, title: string, content: string, sourceType: string) {
    const supabase = await createClient();

    // 1. Create Document Record
    const { data: doc, error: docError } = await supabase
      .from('knowledge_documents')
      .insert([{
        user_id: userId,
        title,
        source_type: sourceType,
        status: 'processing'
      }])
      .select()
      .single();

    if (docError) throw docError;

    try {
      // 2. Chunk Content
      const chunks = chunkingService.chunkText(content);
      
      // 3. Process Chunks
      for (let i = 0; i < chunks.length; i++) {
        const text = chunks[i];
        
        // 4. Generate Embedding
        const embedding = await embeddingService.generateEmbedding(text);

        // 5. Save Chunk
        await supabase
          .from('knowledge_chunks')
          .insert([{
            document_id: doc.id,
            content: text,
            embedding,
            chunk_index: i
          }]);
      }

      // 6. Mark as Indexed
      await supabase
        .from('knowledge_documents')
        .update({ status: 'indexed' })
        .eq('id', doc.id);

      return doc.id;

    } catch (err) {
      await supabase
        .from('knowledge_documents')
        .update({ status: 'failed' })
        .eq('id', doc.id);
      throw err;
    }
  }
};
