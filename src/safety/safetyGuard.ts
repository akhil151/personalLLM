import { createClient } from '@/lib/supabase-server';

/**
 * SafetyGuard provides runtime protection for autonomous agents.
 * 
 * WHY SAFETY GUARDS?
 * 1. Runaway Agents: Preventing infinite recursive loops.
 * 2. Cost Control: Stopping execution if token usage or tool calls exceed a budget.
 * 3. Timeout Protection: Ensuring a workflow doesn't hang indefinitely.
 */
export const safetyGuard = {
  private MAX_STEPS = 20;
  private COST_CEILING = 1.00; // $1.00 per run

  /**
   * Validates if a workflow is safe to continue.
   */
  async checkSafety(runId: string, userId: string, currentSteps: number, currentCost: number) {
    const supabase = await createClient();

    // 1. Check Step Limit
    if (currentSteps >= this.MAX_STEPS) {
      await this.logViolation(runId, userId, 'recursion_limit', `Exceeded maximum steps (${this.MAX_STEPS})`);
      return { safe: false, reason: 'Step limit exceeded' };
    }

    // 2. Check Cost Limit
    if (currentCost >= this.COST_CEILING) {
      await this.logViolation(runId, userId, 'cost_limit', `Exceeded cost ceiling ($${this.COST_CEILING})`);
      return { safe: false, reason: 'Cost limit exceeded' };
    }

    return { safe: true };
  },

  private async logViolation(runId: string, userId: string, type: string, details: string) {
    const supabase = await createClient();
    await supabase
      .from('safety_logs')
      .insert([{
        user_id: userId,
        workflow_run_id: runId,
        violation_type: type,
        details,
        action_taken: 'blocked'
      }]);
    
    console.error(`[SAFETY VIOLATION] ${type}: ${details}`);
  }
};
