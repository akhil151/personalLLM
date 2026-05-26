import { createClient } from '@/lib/supabase-server';

/**
 * ObservabilityService tracks AI performance and costs.
 * 
 * WHY THIS MATTERS:
 * In production, you need to know:
 * 1. How much money are we spending? (Tokens)
 * 2. Is the AI slow? (Latency)
 * 3. Which models are most effective?
 */
export const observabilityService = {
  async logChatEvent(data: {
    userId: string;
    conversationId: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
  }) {
    const supabase = await createClient();

    const { error } = await supabase.from('ai_logs').insert({
      user_id: data.userId,
      conversation_id: data.conversationId,
      model: data.model,
      prompt_tokens: data.promptTokens,
      completion_tokens: data.completionTokens,
      total_tokens: data.promptTokens + data.completionTokens,
      latency_ms: data.latencyMs,
    });

    if (error) console.error('Error logging AI event:', error);
  }
};
