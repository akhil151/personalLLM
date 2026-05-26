import OpenAI from 'openai';

/**
 * EmbeddingService handles the generation of vector embeddings.
 * 
 * WHAT ARE EMBEDDINGS?
 * Embeddings are numerical representations of text in a high-dimensional space.
 * Similar meanings are closer together in this space.
 * 
 * MATHEMATICS INTUITION:
 * Think of a 2D graph where 'King' and 'Queen' are dots very close to each other,
 * while 'Apple' is far away. In OpenAI's model, we use 1536 dimensions!
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const embeddingService = {
  /**
   * Generates an embedding vector for the given text.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.replace(/\n/g, ' '), // Clean text for better results
    });

    return response.data[0].embedding;
  }
};
