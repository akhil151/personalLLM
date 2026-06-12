import { createAdminClient } from '../lib/supabase-admin';
import { llmService } from './llmService';
import { ExecutiveBriefSchema } from '../types/schemas';
import { priorityEngine } from './priorityEngine';
import { blockerDetectionService } from './blockerDetectionService';

/**
 * JarvisService handles the executive intelligence layer, providing briefings and summaries.
 */
export const jarvisService = {
  /**
   * Generates a daily executive summary (The "Executive Brief V2").
   */
  async generateExecutiveBrief(userId: string) {
    const supabase = createAdminClient();
    
    // 1. Gather all relevant context using new engines
    const [goals, projects, nextAction, blockers] = await Promise.all([
      supabase.from('user_goals').select('*').eq('user_id', userId).eq('status', 'active'),
      supabase.from('user_projects').select('*, milestones:project_milestones(*)').eq('user_id', userId).eq('status', 'active'),
      priorityEngine.determineNextAction(userId),
      blockerDetectionService.detectBlockers(userId)
    ]);

    // 2. Prepare LLM prompt for V2
    const systemPrompt = `You are the Chief of Staff AI. Generate a TODAY'S EXECUTIVE BRIEF.
The brief must be highly professional, accurate, and focused on driving execution.

Your response MUST be a JSON object with the following keys:
- goal_summary: A concise summary of the primary active goal
- progress_percentage: The overall progress percentage (number)
- active_projects_count: Number of active projects (number)
- completed_milestones_summary: A summary of completed vs total milestones
- blocked_items: An array of strings describing active blockers
- highest_priority: The title of the most important next task
- priority_reason: Why this task is the highest priority
- next_recommended_action: A clear, actionable next step for the user

BE CONCISE. BE ACTIONABLE.`;

    const userPrompt = `Context:
Goals: ${JSON.stringify(goals.data)}
Projects: ${JSON.stringify(projects.data)}
Calculated Next Action: ${JSON.stringify(nextAction)}
Detected Blockers: ${JSON.stringify(blockers)}

Generate the executive brief V2.`;

    const result = await llmService.getStructuredOutput(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      ExecutiveBriefSchema,
      userId,
      'executive-briefing'
    );

    return result;
  },

  /**
   * Tracks progress metrics for the day.
   */
  async trackDailyMetrics(userId: string) {
    const supabase = createAdminClient();
    
    const [goals, projects, tasks] = await Promise.all([
      supabase.from('user_goals').select('count', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
      supabase.from('user_projects').select('count', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
      supabase.from('agent_tasks').select('count', { count: 'exact', head: true }).eq('status', 'completed') // Simplified task tracking
    ]);

    const { data, error } = await supabase
      .from('user_progress_metrics')
      .upsert({
        user_id: userId,
        metric_date: new Date().toISOString().split('T')[0],
        active_goals_count: goals.count || 0,
        active_projects_count: projects.count || 0,
        completed_tasks_count: tasks.count || 0,
        project_velocity: 0.0 // Calculated separately if needed
      }, { onConflict: 'user_id,metric_date' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
