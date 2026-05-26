import { createClient } from '@/lib/supabase-server';

/**
 * operationalPatternMiner.ts
 * Mines execution history to find recurring successful patterns that could become skills.
 */
export class OperationalPatternMiner {
  /**
   * Identifies candidate sequences for skill abstraction.
   */
  public static async minePatterns(userId: string) {
    const supabase = await createClient();

    // 1. Fetch recent successful steps
    const { data: steps } = await supabase
      .from('execution_steps')
      .select('agent_name, step_type, tool_call, tool_output')
      .eq('step_type', 'action')
      .limit(200);

    if (!steps) return [];

    // 2. Simple n-gram style mining for tool sequences
    const toolSequences: string[] = [];
    for (let i = 0; i < steps.length - 2; i++) {
      if (steps[i].tool_call && steps[i+1].tool_call) {
        toolSequences.push(`${steps[i].tool_call.name}->${steps[i+1].tool_call.name}`);
      }
    }

    // 3. Count frequencies
    const frequencies: Record<string, number> = {};
    toolSequences.forEach(s => frequencies[s] = (frequencies[s] || 0) + 1);

    // 4. Return patterns with high frequency
    return Object.entries(frequencies)
      .filter(([_, count]) => count > 3)
      .map(([sequence, count]) => ({
        sequence,
        count,
        confidence: count / 10 // Mock confidence
      }));
  }
}
