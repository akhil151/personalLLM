import { ReasoningCritic } from './reasoningCritic';
import { CognitiveEvaluator } from './cognitiveEvaluator';
import { StrategyAnalyzer } from './strategyAnalyzer';
import { createClient } from '@/lib/supabase-server';

/**
 * metaReasoningEngine.ts
 * The high-level orchestrator for introspective cognition.
 */
export class MetaReasoningEngine {
  /**
   * Performs an introspective analysis of a recent execution.
   */
  public static async performIntrospection(runId: string, userId: string) {
    const supabase = await createClient();

    // 1. Gather all execution data
    const { data: steps } = await supabase
      .from('execution_steps')
      .select('*')
      .eq('run_id', runId);

    if (!steps) return;

    // 2. Run meta-analysis components
    const evaluations = steps.map(step => ({
      stepId: step.id,
      reasoningEvaluation: step.step_type === 'thought' ? ReasoningCritic.evaluateReasoning(step.content) : null,
      toolEvaluation: step.tool_call ? CognitiveEvaluator.evaluateToolPerformance(step.tool_call.name, step.tool_output) : null
    }));

    const strategyAnalysis = await StrategyAnalyzer.analyzeRunStrategy(runId);

    // 3. Synthesize "Meta-Lesson"
    const metaLesson = {
      runId,
      overallEfficiency: strategyAnalysis.efficiencyScore,
      keyTakeaway: strategyAnalysis.optimizations[0]?.type || 'Maintain current strategy',
      improvementAreas: strategyAnalysis.bottlenecks
    };

    // 4. Persist the meta-reasoning result
    await supabase
      .from('adaptation_history')
      .insert([{
        user_id: userId,
        adaptation_type: 'meta_reasoning_introspection',
        old_state: { runId },
        new_state: metaLesson,
        reasoning: 'Automated post-run introspection.'
      }]);

    return metaLesson;
  }
}
