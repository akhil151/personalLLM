import { createAdminClient } from '../lib/supabase-admin';

export interface BlockerOutput {
  blockerType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

/**
 * BlockerDetectionService identifies execution impediments.
 */
export const blockerDetectionService = {
  /**
   * Scans for active blockers across all user projects.
   */
  async detectBlockers(userId: string): Promise<BlockerOutput[]> {
    const supabase = createAdminClient();
    const blockers: BlockerOutput[] = [];

    // 1. Fetch active projects and milestones
    const { data: projects } = await supabase
      .from('user_projects')
      .select('*, milestones:project_milestones(*, tasks:milestone_tasks(*))')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!projects) return [];

    for (const project of projects) {
      // Check 1: STALLED PROJECTS (No milestone progress for 14+ days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      const lastUpdate = new Date(project.updated_at);
      if (lastUpdate < fourteenDaysAgo && project.health_state !== 'red') {
        blockers.push({
          blockerType: 'Stalled Progress',
          severity: 'high',
          recommendation: `Project "${project.title}" has seen no activity for 14 days. Consider breaking down the current milestone into smaller tasks.`
        });
      }

      // Check 2: DEPENDENCY BLOCKERS
      // (Using project_dependencies table)
      const { data: deps } = await supabase
        .from('project_dependencies')
        .select('*')
        .eq('project_id', project.id);

      if (deps) {
        for (const dep of deps) {
          // Check if dependency is completed
          if (dep.dependency_type === 'milestone') {
            const { data: m } = await supabase.from('project_milestones').select('status').eq('id', dep.dependency_id).single();
            if (m && m.status !== 'completed') {
              blockers.push({
                blockerType: 'Dependency Blocked',
                severity: 'medium',
                recommendation: `Milestone is blocked by incomplete dependency. Focus on completing the prerequisite.`
              });
            }
          }
        }
      }

      // Check 3: EXECUTION BLOCKERS (Task failed repeatedly)
      for (const milestone of project.milestones || []) {
        for (const task of milestone.tasks || []) {
          if (task.status === 'failed') {
            blockers.push({
              blockerType: 'Execution Failure',
              severity: 'critical',
              recommendation: `Task "${task.title}" has failed. Review error logs or try a different approach (e.g., use Research Agent).`
            });
          }
        }
      }
    }

    return blockers;
  }
};
