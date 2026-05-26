import { createClient } from '@/lib/supabase-server';

/**
 * adaptiveBudgetEngine.ts
 * Manages token and financial budgets for AI operations.
 */
export class AdaptiveBudgetEngine {
  /**
   * Checks if a user has sufficient budget for an operation.
   */
  public static async checkBudget(userId: string, estimatedTokens: number) {
    const supabase = await createClient();

    // 1. Fetch recent usage from ai_logs
    const { data: logs } = await supabase
      .from('ai_logs')
      .select('total_tokens')
      .eq('user_id', userId)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24h

    const totalUsed = logs?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0;
    const dailyLimit = 1000000; // 1M tokens daily limit

    return {
      allowed: totalUsed + estimatedTokens < dailyLimit,
      remaining: dailyLimit - totalUsed,
      usagePercent: (totalUsed / dailyLimit) * 100
    };
  }

  /**
   * Allocates a specific token budget for a task based on priority.
   */
  public static allocateBudget(priority: 'high' | 'medium' | 'low'): number {
    const budgets = {
      high: 10000,
      medium: 3000,
      low: 1000
    };
    return budgets[priority];
  }
}
