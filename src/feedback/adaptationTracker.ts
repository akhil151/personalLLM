import { createClient } from '@/lib/supabase-server';

/**
 * adaptationTracker.ts
 * Records and tracks the evolution of agent behaviors and strategies.
 */
export class AdaptationTracker {
  /**
   * Logs a behavioral adaptation event.
   */
  public static async trackAdaptation(params: {
    userId: string;
    type: 'strategy_update' | 'preference_shift' | 'skill_acquisition';
    oldState: any;
    newState: any;
    reasoning: string;
  }) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('adaptation_history')
      .insert([{
        user_id: params.userId,
        adaptation_type: params.type,
        old_state: params.oldState,
        new_state: params.newState,
        reasoning: params.reasoning
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Measures the impact of an adaptation by comparing performance metrics before and after.
   */
  public static async measureImpact(adaptationId: string) {
    const supabase = await createClient();

    // 1. Get the adaptation details
    const { data: adaptation, error: fetchError } = await supabase
      .from('adaptation_history')
      .select('*')
      .eq('id', adaptationId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Fetch performance metrics after the adaptation timestamp
    const { data: rewards, error: rewardError } = await supabase
      .from('learning_rewards')
      .select('reward_score')
      .eq('user_id', adaptation.user_id)
      .gt('created_at', adaptation.created_at)
      .limit(10); // Look at the next 10 relevant events

    if (rewardError) throw rewardError;

    if (!rewards || rewards.length === 0) return 0;

    // 3. Calculate average impact
    const avgImpact = rewards.reduce((acc, r) => acc + r.reward_score, 0) / rewards.length;

    // 4. Update the adaptation history with the impact score
    await supabase
      .from('adaptation_history')
      .update({ impact_score: avgImpact })
      .eq('id', adaptationId);

    return avgImpact;
  }
}
