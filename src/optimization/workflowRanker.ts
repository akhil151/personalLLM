import { createClient } from '@/lib/supabase-server';

/**
 * workflowRanker.ts
 * Ranks workflow templates based on historical performance metrics.
 */
export class WorkflowRanker {
  /**
   * Ranks available templates for a specific goal.
   */
  public static async rankTemplates(userId: string, goal: string) {
    const supabase = await createClient();

    const { data: templates } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('user_id', userId);

    if (!templates) return [];

    // Calculate score based on success rate, avg latency, and semantic relevance
    const ranked = templates.map(t => ({
      ...t,
      score: (t.avg_performance_score || 0) * 0.7 + (this.calculateRelevance(t.name, goal)) * 0.3
    }));

    return ranked.sort((a, b) => b.score - a.score);
  }

  private static calculateRelevance(templateName: string, goal: string): number {
    // Simple keyword overlap for relevance
    const templateWords = templateName.toLowerCase().split(' ');
    const goalWords = goal.toLowerCase().split(' ');
    const intersection = templateWords.filter(w => goalWords.includes(w));
    return intersection.length / Math.max(templateWords.length, 1);
  }
}
