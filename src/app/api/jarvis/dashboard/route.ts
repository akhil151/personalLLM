import { NextResponse } from 'next/server';
import { jarvisService } from '@/services/jarvisService';
import { goalManagerService } from '@/services/goalManagerService';
import { projectStateService } from '@/services/projectStateService';
import { priorityEngine } from '@/services/priorityEngine';
import { blockerDetectionService } from '@/services/blockerDetectionService';
import { jarvisRecommendationService } from '@/services/jarvisRecommendationService';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET() {
  try {
    // For demo purposes, we'll use a placeholder user ID - in a real app, this would come from auth
    const userId = 'demo-user-id';

    // Fetch all required data in parallel
    const [
      executiveBrief,
      activeGoals,
      activeProjects,
      nextAction,
      blockers,
      recommendations,
      // Fetch tasks from milestone_tasks and agent_tasks
      { data: milestoneTasks },
      { data: agentTasks }
    ] = await Promise.all([
      jarvisService.generateExecutiveBrief(userId),
      goalManagerService.getActiveGoals(userId),
      projectStateService.getActiveProjects(userId),
      priorityEngine.determineNextAction(userId),
      blockerDetectionService.detectBlockers(userId),
      jarvisRecommendationService.getLatestRecommendations(userId),
      createAdminClient().from('milestone_tasks').select('*, milestone:project_milestones(project_id, goal_id)'),
      createAdminClient().from('agent_tasks').select('*')
    ]);

    // Prepare tasks data
    const allTasks = [...(milestoneTasks || []), ...(agentTasks || [])];
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = allTasks.filter(t => {
      const updatedAt = t.updated_at || t.created_at;
      return updatedAt && updatedAt.startsWith(today);
    });
    const highPriorityTasks = allTasks.filter(t => t.priority === 'high');
    const overdueTasks = allTasks.filter(t => {
      if (t.status === 'completed') return false;
      // Check if task has a target date or use milestone target date
      const targetDate = t.target_date || (t.milestone && t.milestone.target_date);
      if (!targetDate) return false;
      return new Date(targetDate) < new Date();
    });

    // Prepare metrics
    const metrics = {
      activeGoals: activeGoals.length,
      activeProjects: activeProjects.length,
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(t => t.status === 'completed').length,
      blockedCount: blockers.length
    };

    const dashboardData = {
      executiveBrief: {
        currentFocus: executiveBrief.goal_summary,
        highestPriorityGoal: activeGoals[0] || null,
        highestPriorityProject: activeProjects[0] || null,
        nextBestAction: nextAction,
        activeBlockers: blockers,
        dailyProgressSummary: executiveBrief
      },
      goals: activeGoals,
      projects: activeProjects,
      tasks: {
        today: todayTasks,
        highPriority: highPriorityTasks,
        overdue: overdueTasks,
        recommended: highPriorityTasks.slice(0, 5)
      },
      recommendations,
      blockers,
      metrics
    };

    return NextResponse.json(dashboardData);
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
