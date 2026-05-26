import { createClient } from '@/lib/supabase-server';

/**
 * workflowTemplateGenerator.ts
 * Converts successful execution traces into reusable workflow templates.
 */
export class WorkflowTemplateGenerator {
  /**
   * Generates a template from a specific run.
   */
  public static async generateFromRun(runId: string, userId: string, templateName: string) {
    const supabase = await createClient();

    // 1. Fetch the run's steps
    const { data: steps } = await supabase
      .from('execution_steps')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: true });

    if (!steps) throw new Error('Run not found or has no steps');

    // 2. Abstract the steps (Remove specific values, keep structure)
    const abstractedSteps = steps.map(s => ({
      agent: s.agent_name,
      type: s.step_type,
      tool: s.tool_call?.name,
      // Logic to generalize parameters would go here
    }));

    // 3. Persist the template
    const { data, error } = await supabase
      .from('workflow_templates')
      .insert([{
        user_id: userId,
        name: templateName,
        structure: { steps: abstractedSteps },
        avg_performance_score: 1.0 // Initial score
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
