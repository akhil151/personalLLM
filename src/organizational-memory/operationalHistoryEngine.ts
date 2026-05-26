import { createClient } from '@/lib/supabase-server';

/**
 * operationalHistoryEngine.ts
 * Captures and structures high-level operational history for institutional learning.
 */
export class OperationalHistoryEngine {
  /**
   * Records a significant operational event into the institutional record.
   */
  public static async recordInstitutionalEvent(params: {
    type: 'success' | 'failure' | 'breakthrough';
    context: string;
    description: string;
    outcome: any;
  }) {
    const supabase = await createClient();

    // We use the operational_playbooks or a new institutional_logs table
    // For now, let's use the adaptation_history with a 'global' scope flag in metadata
    await supabase
      .from('adaptation_history')
      .insert([{
        user_id: '00000000-0000-0000-0000-000000000000', // System-level user ID
        adaptation_type: `institutional_${params.type}`,
        old_state: { context: params.context },
        new_state: params.outcome,
        reasoning: params.description,
        metadata: { global_scope: true }
      }]);
  }

  /**
   * Retrieves historical insights for a specific operational context.
   */
  public static async getHistoricalInsights(context: string) {
    const supabase = await createClient();

    const { data } = await supabase
      .from('adaptation_history')
      .select('*')
      .ilike('reasoning', `%${context}%`)
      .order('created_at', { ascending: false });

    return data;
  }
}
