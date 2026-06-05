import { createAdminClient } from '@/lib/supabase-admin';

/**
 * ObservabilityService tracks AI performance, costs, and runtime health.
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
    const supabase = createAdminClient();

    const { error } = await supabase.from('ai_logs').insert({
      user_id: data.userId,
      conversation_id: data.conversationId,
      model: data.model,
      prompt_tokens: data.promptTokens,
      completion_tokens: data.completionTokens,
      total_tokens: data.promptTokens + data.completionTokens,
      latency_ms: data.latencyMs,
    });

    if (error) console.error('[OBSERVABILITY] Error logging AI event:', error);
  },

  /**
   * Tracks worker health and queue latency.
   */
  async logWorkerEvent(type: 'job_started' | 'job_completed' | 'job_failed', jobId: string, metadata: any = {}) {
    console.log(`[OBSERVABILITY] Worker ${type}: ${jobId}`, metadata);
    // In a full implementation, this would write to a 'worker_metrics' table
  },

  /**
   * Tracks recovery operations.
   */
  async logRecoveryEvent(runId: string, details: string) {
    console.log(`[OBSERVABILITY] Recovery triggered for ${runId}: ${details}`);
    const supabase = createAdminClient();
    await supabase.from('safety_logs').insert({
      run_id: runId,
      violation_type: 'recovery_triggered',
      details,
      action_taken: 'resumed'
    });
  }
};
