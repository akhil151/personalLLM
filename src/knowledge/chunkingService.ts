/**
 * ChunkingService splits large documents into smaller, semantically meaningful pieces.
 * 
 * WHY CHUNKING?
 * 1. Context Limits: LLMs have a maximum "context window."
 * 2. Relevance: Searching for small chunks provides more precise retrieval than searching entire books.
 * 3. Cost: Smaller chunks use fewer tokens.
 */
export const chunkingService = {
  /**
   * Simple character-based chunking with overlap.
   * In production, you might use recursive character splitting or semantic splitting.
   */
  chunkText(text: string, size: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + size, text.length);
      chunks.push(text.slice(start, end));
      start += (size - overlap);
    }

    return chunks;
  }
};
