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

    // 4. Create milestones
    const milestones = plan.milestones.map((m, index) => ({
      project_id: project.id,
      title: m.title || `Milestone ${index + 1}`,
      description: m.description || '',
      order_index: typeof m.order_index === 'number' ? m.order_index : index,
      status: 'pending',
      target_date: m.target_date
    }));

    const { error: milestoneError } = await supabase
      .from('project_milestones')
      .insert(milestones);

    if (milestoneError) throw milestoneError;

    return { project, milestones };
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

    const blockedCount = milestones.filter(m => m.status === 'blocked').length;
    const overdueCount = milestones.filter(m => {
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
      .select('*, milestones:project_milestones(*)')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;
    return project;
  }
};
