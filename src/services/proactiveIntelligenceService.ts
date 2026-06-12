
import { createAdminClient } from '../lib/supabase-admin';

export interface GoalDrift {
  goalId: string;
  goalTitle: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  recommendedIntervention: string;
  daysSinceLastActivity: number;
}

export interface EscalatedBlocker {
  blockerId: string;
  projectId: string;
  projectTitle: string;
  ageDays: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedResolution: string;
}

export interface ProductivityAnalytics {
  taskCompletionVelocity: number;
  milestoneCompletionRate: number;
  goalProgressTrend: 'improving' | 'stable' | 'declining';
  projectHealthTrend: 'improving' | 'stable' | 'declining';
}

export interface Risk {
  type: 'overdue_milestone' | 'repeated_task_failure' | 'stalled_goal' | 'escalated_blocker';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  relatedId: string;
}

export interface DailyExecutiveBrief {
  currentFocus: string;
  highestPriorityGoal: any;
  highestPriorityProject: any;
  openRisks: Risk[];
  criticalBlockers: EscalatedBlocker[];
  recommendedAction: string;
}

export const proactiveIntelligenceService = {
  /**
   * Runs the complete daily intelligence pipeline.
   */
  async runDailyIntelligence(userId: string): Promise<void> {
    console.log(`[PROACTIVE_INTELLIGENCE] Running daily intelligence for user ${userId}`);
    
    await Promise.all([
      this.detectGoalDrift(userId),
      this.escalateBlockers(userId),
      this.detectRisks(userId),
      this.generateDailyBriefing(userId),
      this.getProductivityAnalytics(userId),
    ]);
  },
  /**
   * Feature 1: Goal Drift Detection
   */
  async detectGoalDrift(userId: string): Promise<GoalDrift[]> {
    const supabase = createAdminClient();
    const drifts: GoalDrift[] = [];

    const { data: goals } = await supabase
      .from('user_goals')
      .select('*, projects:user_projects(*, milestones:project_milestones(*, tasks:milestone_tasks(*)))')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!goals) return [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const goal of goals) {
      let lastActivityDate = new Date(goal.updated_at);

      // Find latest activity date across projects, milestones, tasks
      for (const project of goal.projects || []) {
        const projectUpdated = new Date(project.updated_at);
        if (projectUpdated > lastActivityDate) lastActivityDate = projectUpdated;

        for (const milestone of project.milestones || []) {
          const milestoneUpdated = new Date(milestone.updated_at);
          if (milestoneUpdated > lastActivityDate) lastActivityDate = milestoneUpdated;

          for (const task of milestone.tasks || []) {
            const taskUpdated = new Date(task.updated_at);
            if (taskUpdated > lastActivityDate) lastActivityDate = taskUpdated;
          }
        }
      }

      const daysSinceLastActivity = Math.floor(
        (new Date().getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastActivity >= 7) {
        let severity: GoalDrift['severity'] = 'low';
        let rootCause = 'No progress detected on goal';
        let recommendedIntervention = 'Review and prioritize next steps for this goal.';

        if (daysSinceLastActivity >= 14) severity = 'medium';
        if (daysSinceLastActivity >= 21) severity = 'high';
        if (daysSinceLastActivity >= 30) {
          severity = 'critical';
          rootCause = 'Goal has been completely stalled for over a month';
          recommendedIntervention = 'Consider breaking down this goal into smaller projects or re-prioritizing.';
        }

        drifts.push({
          goalId: goal.id,
          goalTitle: goal.title,
          severity,
          rootCause,
          recommendedIntervention,
          daysSinceLastActivity
        });
      }
    }

    return drifts;
  },

  /**
   * Feature 2: Blocker Escalation Engine
   */
  async escalateBlockers(userId: string): Promise<EscalatedBlocker[]> {
    const supabase = createAdminClient();
    const escalated: EscalatedBlocker[] = [];

    const { data: blockers } = await supabase
      .from('project_blockers')
      .select('*, project:user_projects(*)')
      .is('resolved_at', null);

    if (!blockers) return [];

    for (const blocker of blockers) {
      const createdDate = new Date(blocker.created_at);
      const ageDays = Math.floor(
        (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      let severity: EscalatedBlocker['severity'] = 'low';
      if (ageDays >= 4 && ageDays <= 7) severity = 'medium';
      if (ageDays >= 8 && ageDays <= 14) severity = 'high';
      if (ageDays >= 15) severity = 'critical';

      escalated.push({
        blockerId: blocker.id,
        projectId: blocker.project_id,
        projectTitle: blocker.project?.title || 'Unknown Project',
        ageDays,
        severity,
        suggestedResolution: blocker.recommendation || 'Address this blocker immediately.'
      });
    }

    return escalated;
  },

  /**
   * Feature 3: Next Best Action Engine V2
   */
  async determineNextBestActionV2(userId: string) {
    const supabase = createAdminClient();

    const [goals, projects, milestones, tasks, blockers, escalatedBlockers] = await Promise.all([
      supabase.from('user_goals').select('*').eq('user_id', userId).eq('status', 'active'),
      supabase.from('user_projects').select('*').eq('user_id', userId).eq('status', 'active'),
      supabase.from('project_milestones').select('*').eq('status', 'in_progress'),
      supabase.from('milestone_tasks').select('*, milestone:project_milestones(project_id, goal_id)').eq('status', 'pending'),
      supabase.from('project_blockers').select('*').eq('resolved_at', null),
      this.escalateBlockers(userId)
    ]);

    const activeTasks = tasks.data || [];
    if (activeTasks.length === 0) {
      return {
        nextAction: "Define new goals or projects",
        reason: "No active tasks found.",
        impact: "High",
        urgency: "Medium",
        score: 0
      };
    }

    const scoredTasks = activeTasks.map((task: any) => {
      let score = 0;
      let importance = 30; // default medium
      let urgency = 30; // default medium
      let projectHealthBonus = 0;
      let goalAlignmentBonus = 0;

      if (task.priority === 'high') importance = 50;
      if (task.priority === 'low') importance = 10;

      // Check if task's project is in a bad state (needs attention)
      const taskProject = projects.data?.find((p: any) => p.id === task.milestone?.project_id);
      if (taskProject?.health_state === 'red') {
        projectHealthBonus = 30;
        urgency += 20;
      } else if (taskProject?.health_state === 'yellow') {
        projectHealthBonus = 15;
        urgency += 10;
      }

      // Check if task's goal is highest priority
      const taskGoal = goals.data?.find((g: any) => g.id === task.milestone?.goal_id);
      if (taskGoal?.priority === 'high') {
        goalAlignmentBonus = 20;
      }

      // Penalty if task is blocked
      const isBlocked = (blockers.data || []).some((b: any) => 
        b.task_id === task.id || b.milestone_id === task.milestone_id
      );
      if (isBlocked) score -= 100;

      // Bonus if task is first in milestone (dependency)
      if (task.order_index === 0) score += 20;

      score += importance + urgency + projectHealthBonus + goalAlignmentBonus;

      return {
        task,
        score,
        importance,
        urgency
      };
    });

    const bestTask = scoredTasks.reduce((prev: any, current: any) => 
      (prev.score > current.score) ? prev : current
    );

    return {
      nextAction: bestTask.task.title,
      reason: bestTask.task.description || "Highest priority task based on goal alignment and project health.",
      impact: bestTask.importance > 40 ? "High" : "Medium",
      urgency: bestTask.urgency > 40 ? "High" : "Medium",
      score: bestTask.score
    };
  },

  /**
   * Feature 4: Daily Executive Briefing
   */
  async generateDailyBriefing(userId: string): Promise<DailyExecutiveBrief> {
    const supabase = createAdminClient();

    const [
      goals,
      projects,
      drifts,
      escalatedBlockers,
      risks,
      nextAction
    ] = await Promise.all([
      supabase.from('user_goals').select('*').eq('user_id', userId).eq('status', 'active'),
      supabase.from('user_projects').select('*').eq('user_id', userId).eq('status', 'active'),
      this.detectGoalDrift(userId),
      this.escalateBlockers(userId),
      this.detectRisks(userId),
      this.determineNextBestActionV2(userId)
    ]);

    const activeGoals = goals.data || [];
    const activeProjects = projects.data || [];

    let highestPriorityGoal = activeGoals.sort((a: any, b: any) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (a.priority !== b.priority) {
        return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    })[0] || null;

    let highestPriorityProject = activeProjects.sort((a: any, b: any) => {
      const healthOrder = { red: 3, yellow: 2, green: 1 };
      if (a.health_state !== b.health_state) {
        return healthOrder[a.health_state as keyof typeof healthOrder] - healthOrder[b.health_state as keyof typeof healthOrder];
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    })[0] || null;

    const criticalBlockers = escalatedBlockers.filter(b => 
      b.severity === 'critical' || b.severity === 'high'
    );

    const openRisks = risks.filter(r => 
      r.severity === 'critical' || r.severity === 'high'
    );

    const currentFocus = highestPriorityGoal?.title || 
                         highestPriorityProject?.title || 
                         "Focus on your current priorities.";

    return {
      currentFocus,
      highestPriorityGoal,
      highestPriorityProject,
      openRisks,
      criticalBlockers,
      recommendedAction: nextAction.nextAction
    };
  },

  /**
   * Feature 5: Productivity Analytics
   */
  async getProductivityAnalytics(userId: string): Promise<ProductivityAnalytics> {
    const supabase = createAdminClient();

    // Get task completion velocity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [completedTasks, totalMilestones, completedMilestones, goals] = await Promise.all([
      supabase.from('milestone_tasks').select('count', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('updated_at', sevenDaysAgo.toISOString()),
      supabase.from('project_milestones').select('count', { count: 'exact', head: true }),
      supabase.from('project_milestones').select('count', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('user_goals').select('*').eq('user_id', userId).eq('status', 'active')
    ]);

    const taskVelocity = completedTasks.count || 0;
    const milestoneRate = totalMilestones.count ? Math.round((completedMilestones.count || 0) / totalMilestones.count * 100) : 0;

    // Simple trend calculation (placeholder for real trend analysis)
    const goalProgressTrend = 'stable';
    const projectHealthTrend = 'stable';

    return {
      taskCompletionVelocity: taskVelocity,
      milestoneCompletionRate: milestoneRate,
      goalProgressTrend,
      projectHealthTrend
    };
  },

  /**
   * Feature 6: Risk Detection
   */
  async detectRisks(userId: string): Promise<Risk[]> {
    const supabase = createAdminClient();
    const risks: Risk[] = [];

    const [goals, projects, milestones, tasks, escalatedBlockers] = await Promise.all([
      supabase.from('user_goals').select('*').eq('user_id', userId).eq('status', 'active'),
      supabase.from('user_projects').select('*').eq('user_id', userId).eq('status', 'active'),
      supabase.from('project_milestones').select('*'),
      supabase.from('milestone_tasks').select('*'),
      this.escalateBlockers(userId)
    ]);

    // Check for overdue milestones
    for (const milestone of milestones.data || []) {
      if (milestone.target_date && milestone.status !== 'completed') {
        const targetDate = new Date(milestone.target_date);
        if (targetDate < new Date()) {
          risks.push({
            type: 'overdue_milestone',
            description: `Milestone "${milestone.title}" is overdue.`,
            severity: 'high',
            relatedId: milestone.id
          });
        }
      }
    }

    // Check for repeated task failures
    const failedTasks = tasks.data?.filter((t: any) => t.status === 'failed') || [];
    if (failedTasks.length > 2) {
      risks.push({
        type: 'repeated_task_failure',
        description: `Multiple tasks (${failedTasks.length}) have failed. Review execution strategy.`,
        severity: 'critical',
        relatedId: failedTasks[0].id
      });
    }

    // Check for stalled goals
    const drifts = await this.detectGoalDrift(userId);
    for (const drift of drifts) {
      if (drift.severity === 'high' || drift.severity === 'critical') {
        risks.push({
          type: 'stalled_goal',
          description: `Goal "${drift.goalTitle}" has been stalled for ${drift.daysSinceLastActivity} days.`,
          severity: drift.severity,
          relatedId: drift.goalId
        });
      }
    }

    // Check for escalated blockers
    for (const blocker of escalatedBlockers) {
      if (blocker.severity === 'high' || blocker.severity === 'critical') {
        risks.push({
          type: 'escalated_blocker',
          description: `Blocker on "${blocker.projectTitle}" is ${blocker.severity} (${blocker.ageDays} days old).`,
          severity: blocker.severity,
          relatedId: blocker.blockerId
        });
      }
    }

    return risks;
  }
};
