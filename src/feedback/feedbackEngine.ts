import { createClient } from '@/lib/supabase-server';
import { LearningSignal, SignalType } from './learningSignals';
import { RewardModel } from './rewardModel';

/**
 * feedbackEngine.ts
 * Core engine for capturing, analyzing, and persisting feedback events.
 */
export class FeedbackEngine {
  /**
   * Captures a new feedback event and calculates associated rewards.
   */
  public static async captureFeedback(signal: LearningSignal, userId: string) {
    const supabase = await createClient();

    // 1. Persist the raw feedback event
    const { data: event, error: eventError } = await supabase
      .from('feedback_events')
      .insert([{
        user_id: userId,
        run_id: signal.context.runId,
        event_type: signal.type,
        source: 'system',
        content: signal.value,
        metadata: {
          ...signal.metadata,
          context: signal.context
        }
      }])
      .select()
      .single();

    if (eventError) throw eventError;

    // 2. Calculate and persist reward
    const rewardScore = RewardModel.calculateReward([signal]);
    
    const { error: rewardError } = await supabase
      .from('learning_rewards')
      .insert([{
        user_id: userId,
        feedback_event_id: event.id,
        reward_score: rewardScore,
        context: signal.type,
        metadata: {
          insight: RewardModel.getFeedbackInsight(rewardScore)
        }
      }]);

    if (rewardError) throw rewardError;

    // 3. Trigger behavioral signal recording
    await this.recordBehavioralSignal(signal, userId);

    return { event, rewardScore };
  }

  /**
   * Records behavioral signals for long-term pattern analysis.
   */
  private static async recordBehavioralSignal(signal: LearningSignal, userId: string) {
    const supabase = await createClient();

    await supabase
      .from('behavioral_signals')
      .insert([{
        user_id: userId,
        signal_type: signal.type,
        value: signal.value,
        context: signal.context.agentName || 'system'
      }]);
  }

  /**
   * Analyzes recent feedback to identify areas for adaptation.
   */
  public static async analyzeRecentPerformance(userId: string, limit: number = 50) {
    const supabase = await createClient();

    const { data: rewards, error } = await supabase
      .from('learning_rewards')
      .select(`
        reward_score,
        context,
        feedback_events (
          event_type,
          content,
          metadata
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Simple analysis: group by context and calculate average reward
    const performanceMap: Record<string, { total: number, count: number }> = {};
    
    rewards?.forEach((r: any) => {
      if (!performanceMap[r.context]) performanceMap[r.context] = { total: 0, count: 0 };
      performanceMap[r.context].total += r.reward_score;
      performanceMap[r.context].count += 1;
    });

    return Object.entries(performanceMap).map(([context, stats]) => ({
      context,
      averageReward: stats.total / stats.count,
      sampleSize: stats.count
    }));
  }
}
