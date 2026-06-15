import { createAdminClient } from '../lib/supabase-admin';

export interface PriorityOutput {
  nextAction: string;
  reason: string;
  impact: string;
  urgency: string;
  score: number;
}

/**
 * PriorityEngine determines the next best action for the user.
 */
export const priorityEngine = {
  /**
   * Calculates the priority score for a task.
   */
  async determineNextAction(userId: string): Promise<PriorityOutput> {
    const supabase = createAdminClient();

    // 1. Fetch all relevant data
    const [goals, projects, milestones, tasks, blockers] = await Promise.all([
      supabase.from('user_goals').select('*').eq('user_id', userId).eq('status', 'active'),
      supabase.from('user_projects').select('*').eq('user_id', userId).eq('status', 'active'),
      supabase.from('project_milestones').select('*').eq('status', 'in_progress'),
      supabase.from('milestone_tasks').select('*, milestone:project_milestones(project_id)').eq('status', 'pending'),
      supabase.from('project_blockers').select('*').eq('resolved_at', null)
    ]);

    const activeTasks = tasks.data || [];
    const activeBlockers = blockers.data || [];

    if (activeTasks.length === 0) {
      return {
        nextAction: "Define new goals or projects",
        reason: "No active tasks found.",
        impact: "Medium",
        urgency: "Medium",
        score: 0
      };
    }

    // 2. Score each task
    const scoredTasks = activeTasks.map((task: any) => {
      let importance = 30; // default medium
      let urgency = 30; // default medium
      let dependencyWeight = 0;
      let blockedPenalty = 0;

      // Map priority to score
      if (task.priority === 'high') importance = 50;
      if (task.priority === 'low') importance = 10;

      // Urgency based on target_date if available (checking milestone target_date)
      // For now, let's assume default urgency or check task metadata

      // Dependency Weight (simplified: if it's the first task in a milestone)
      if (task.order_index === 0) dependencyWeight = 20;

      // Blocked Penalty
      const isBlocked = activeBlockers.some((b: any) => b.task_id === task.id || b.milestone_id === task.milestone_id);
      if (isBlocked) blockedPenalty = 100;

      const score = importance + urgency + dependencyWeight - blockedPenalty;

      return {
        task,
        score,
        importance,
        urgency
      };
    });

    // 3. Find highest score
    const bestTask = scoredTasks.reduce((prev: any, current: any) => (prev.score > current.score) ? prev : current);

    return {
      nextAction: bestTask.task.title,
      reason: bestTask.task.description || "Highest priority task based on goal alignment.",
      impact: bestTask.importance > 40 ? "High" : "Medium",
      urgency: bestTask.urgency > 40 ? "High" : "Medium",
      score: bestTask.score
    };
  }
};
