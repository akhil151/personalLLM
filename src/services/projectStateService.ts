import { createAdminClient } from '../lib/supabase-admin';
import { goalManagerService } from './goalManagerService';

/**
 * ProjectStateService handles the conversion of goals into projects and manages project health.
 */
export const projectStateService = {
  /**
   * Converts a goal into a project with milestones.
   */
  async convertGoalToProject(userId: string, goalId: string) {
    const supabase = createAdminClient();
    
    // 1. Fetch goal
    const { data: goal, error: goalError } = await supabase
      .from('user_goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (goalError) throw goalError;

    // 2. Generate plan
    const plan = await goalManagerService.generateMilestonePlan(goalId, userId);

    // 3. Create project
    const { data: project, error: projectError } = await supabase
      .from('user_projects')
      .insert([{
        user_id: userId,
        goal_id: goalId,
        title: goal.title,
        description: goal.description,
        status: 'active',
        health_state: 'green'
      }])
      .select()
      .single();

    if (projectError) throw projectError;

    // 4. Create milestones and tasks
    for (let i = 0; i < plan.milestones.length; i++) {
      const m = plan.milestones[i];
      const { data: milestone, error: milestoneError } = await supabase
        .from('project_milestones')
        .insert([{
          project_id: project.id,
          title: m.title || `Milestone ${i + 1}`,
          description: m.description || '',
          order_index: typeof m.order_index === 'number' ? m.order_index : i,
          status: 'pending',
          target_date: m.target_date,
          metadata: {
            priority: m.priority,
            estimated_effort: m.estimated_effort
          }
        }])
        .select()
        .single();

      if (milestoneError) throw milestoneError;

      if (m.tasks && m.tasks.length > 0) {
        const tasks = m.tasks
          .filter(t => t.title && t.title.trim() !== '') // Skip tasks with no title
          .map((t, tIndex) => ({
            milestone_id: milestone.id,
            title: t.title,
            description: t.description || '',
            status: 'pending',
            priority: t.priority || 'medium',
            estimated_effort: t.estimated_effort,
            order_index: tIndex
          }));

        if (tasks.length > 0) {
          const { error: tasksError } = await supabase
            .from('milestone_tasks')
            .insert(tasks);

          if (tasksError) throw tasksError;
        }
      }
    }

    return { project };
  },

  /**
   * Calculates project health based on milestone statuses.
   */
  async calculateProjectHealth(projectId: string) {
    const supabase = createAdminClient();
    
    const { data: milestones, error } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId);

    if (error) throw error;

    const blockedCount = milestones.filter((m: any) => m.status === 'blocked').length;
    const overdueCount = milestones.filter((m: any) => {
      if (!m.target_date || m.status === 'completed') return false;
      return new Date(m.target_date) < new Date();
    }).length;

    let health: 'green' | 'yellow' | 'red' = 'green';

    if (blockedCount > 0 || overdueCount > 2) {
      health = 'red';
    } else if (overdueCount > 0) {
      health = 'yellow';
    }

    await supabase
      .from('user_projects')
      .update({ 
        health_state: health,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    return health;
  },

  /**
   * Fetches the current state of a project for agent context.
   */
  async getProjectState(projectId: string) {
    const supabase = createAdminClient();
    
    const { data: project, error: projectError } = await supabase
      .from('user_projects')
      .select('*, milestones:project_milestones(*, tasks:milestone_tasks(*))')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;
    return project;
  },

  /**
   * Fetches the most recently active project for a user.
   */
  async getActiveProject(userId: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('user_projects')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
    return data;
  }
};
