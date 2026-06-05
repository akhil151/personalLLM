
import { providerRouter } from '../../providers/providerRouter';

/**
 * EmbeddingService handles the generation of vector embeddings.
 * 
 * PHASE Y.6 REFACTOR:
 * Now uses providerRouter for multi-provider support and fallback.
 */
export const embeddingService = {
  /**
   * Generates an embedding vector for the given text.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return await providerRouter.embed(text.replace(/\n/g, ' '));
  }
};
