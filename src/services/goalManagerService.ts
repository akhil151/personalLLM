import { createAdminClient } from '../lib/supabase-admin';
import { llmService } from './llmService';
import { z } from 'zod';

const MilestoneSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  order_index: z.number(),
  target_date: z.string().optional(),
});

const GoalPlanSchema = z.object({
  milestones: z.array(MilestoneSchema),
  priority: z.enum(['low', 'medium', 'high']),
  estimated_completion_date: z.string().optional(),
});

/**
 * GoalManagerService handles high-level user intent.
 * It manages the lifecycle of goals and their conversion into project plans.
 */
export const goalManagerService = {
  /**
   * Creates a new user goal.
   */
  async createGoal(userId: string, title: string, description?: string, priority: 'low' | 'medium' | 'high' = 'medium') {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('user_goals')
      .insert([{
        user_id: userId,
        title,
        description,
        priority,
        status: 'active',
        progress_percentage: 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Generates a milestone plan for a goal using LLM intelligence.
   */
  async generateMilestonePlan(goalId: string, userId: string) {
    const supabase = createAdminClient();
    
    // 1. Fetch goal details
    const { data: goal, error: goalError } = await supabase
      .from('user_goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (goalError) throw goalError;

    // 2. Call LLM to break down goal
    const systemPrompt = `You are a Chief of Staff AI. Break down the following user goal into a logical sequence of milestones.
Each milestone should be actionable and clear.`;
    
    const userPrompt = `Goal: ${goal.title}
Description: ${goal.description || 'No description provided.'}

Provide a structured plan with milestones, priority, and estimated completion dates.`;

    const plan = await llmService.getStructuredOutput(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      GoalPlanSchema,
      userId,
      'goal-planning'
    );

    // 3. Update goal with priority if LLM suggested a better one
    if (plan.priority !== goal.priority) {
      await supabase.from('user_goals').update({ priority: plan.priority }).eq('id', goalId);
    }

    return plan;
  },

  /**
   * Updates goal progress based on related project/task completion.
   */
  async updateProgress(goalId: string) {
    const supabase = createAdminClient();
    
    // Simplified: Calculate progress based on milestones of related projects
    const { data: projects, error: projectsError } = await supabase
      .from('user_projects')
      .select('id')
      .eq('goal_id', goalId);

    if (projectsError) throw projectsError;

    let totalMilestones = 0;
    let completedMilestones = 0;

    for (const project of projects) {
      const { data: milestones } = await supabase
        .from('project_milestones')
        .select('status')
        .eq('project_id', project.id);
      
      if (milestones) {
        totalMilestones += milestones.length;
        completedMilestones += milestones.filter(m => m.status === 'completed').length;
      }
    }

    const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    await supabase
      .from('user_goals')
      .update({ 
        progress_percentage: progress,
        status: progress === 100 ? 'completed' : 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', goalId);

    return progress;
  },

  /**
   * Detects stalled goals (no progress for X days).
   */
  async detectStalledGoals(userId: string) {
    const supabase = createAdminClient();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 7); // 7 days

    const { data: goals, error } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lt('updated_at', thresholdDate.toISOString());

    if (error) throw error;

    for (const goal of goals) {
      await supabase.from('user_goals').update({ status: 'stalled' }).eq('id', goal.id);
    }

    return goals;
  }
};
