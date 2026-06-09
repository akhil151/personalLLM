import { createAdminClient } from '../lib/supabase-admin';
import { llmService } from './llmService';
import { z } from 'zod';

const ExecutiveBriefSchema = z.object({
  current_focus: z.string(),
  recent_changes: z.string(),
  blocked_items: z.array(z.string()),
  next_steps: z.array(z.string()),
  highest_priority_action: z.string()
});

/**
 * JarvisService handles the executive intelligence layer, providing briefings and summaries.
 */
export const jarvisService = {
  /**
   * Generates a daily executive summary (The "Executive Brief").
   */
  async generateExecutiveBrief(userId: string) {
    const supabase = createAdminClient();
    
    // 1. Gather all relevant context
    const [goals, projects, recommendations, recentActivity] = await Promise.all([
      supabase.from('user_goals').select('*').eq('user_id', userId).eq('status', 'active'),
      supabase.from('user_projects').select('*, milestones:project_milestones(*)').eq('user_id', userId).eq('status', 'active'),
      supabase.from('jarvis_recommendations').select('*').eq('user_id', userId).eq('status', 'pending').limit(3),
      supabase.from('messages').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30)
    ]);

    // 2. Prepare LLM prompt
    const systemPrompt = `You are the Chief of Staff AI. Generate a concise, high-impact executive brief for the user.
Answer:
- What is the user working on?
- What changed recently?
- What is blocked?
- What should happen next?
- What is the highest priority action?

BE CONCISE. BE ACTIONABLE.`;

    const userPrompt = `Context:
Goals: ${JSON.stringify(goals.data)}
Projects: ${JSON.stringify(projects.data)}
Recommendations: ${JSON.stringify(recommendations.data)}
Recent Activity: ${JSON.stringify(recentActivity.data)}

Generate the executive brief.`;

    const result = await llmService.getStructuredOutput(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      ExecutiveBriefSchema,
      userId,
      'executive-briefing'
    );

    return {
      current_focus: result.current_focus || 'Analyzing active goals and projects...',
      recent_changes: result.recent_changes || 'Monitoring for updates...',
      blocked_items: result.blocked_items || [],
      next_steps: result.next_steps || [],
      highest_priority_action: result.highest_priority_action || 'Complete initial project setup.'
    };
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
        project_velocity: 0.0, // Calculated separately if needed
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
