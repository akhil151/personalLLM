import { createAdminClient } from '@/lib/supabase-admin';

/**
 * RoutingService handles model selection and cost tracking.
 * 
 * WHY ROUTING?
 * Not every task needs GPT-4o. Simple tasks can use GPT-4o-mini to save 
 * 90% in costs. The Routing Service selects the best model for the job.
 */
export const routingService = {
  /**
   * Selects the most cost-effective model for a given task complexity.
   */
  async getModelForTask(complexity: 'low' | 'medium' | 'high') {
    switch (complexity) {
      case 'low': return 'gpt-4o-mini';
      case 'medium': return 'gpt-4o';
      case 'high': return 'gpt-4o'; // Or o1-preview for complex reasoning
      default: return 'gpt-4o';
    }
  },

  /**
   * Tracks token usage and estimates cost.
   */
  async trackUsage(userId: string, runId: string, model: string, promptTokens: number, completionTokens: number) {
    const rates: Record<string, { prompt: number, completion: number }> = {
      'gpt-4o': { prompt: 0.000005, completion: 0.000015 },
      'gpt-4o-mini': { prompt: 0.00000015, completion: 0.0000006 }
    };

    const rate = rates[model] || rates['gpt-4o'];
    const cost = (promptTokens * rate.prompt) + (completionTokens * rate.completion);

    const supabase = createAdminClient();
    await supabase
      .from('token_usage')
      .insert([{
        user_id: userId,
        run_id: runId,
        model_name: model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        estimated_cost_usd: cost
      }]);
  }
};
