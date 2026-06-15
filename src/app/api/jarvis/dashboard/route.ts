import { NextResponse } from 'next/server';
import { jarvisService } from '@/services/jarvisService';
import { goalManagerService } from '@/services/goalManagerService';
import { projectStateService } from '@/services/projectStateService';
import { priorityEngine } from '@/services/priorityEngine';
import { blockerDetectionService } from '@/services/blockerDetectionService';
import { jarvisRecommendationService } from '@/services/jarvisRecommendationService';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;
    console.log('Dashboard API userId:', userId);

    // Fetch all required data in parallel
    const [
      executiveBrief,
      activeGoals,
      activeProjects,
      nextAction,
      blockers,
      recommendations,
      // Fetch tasks from milestone_tasks and agent_tasks
      { data: milestoneTasks, error: milestoneError },
      { data: agentTasks, error: agentError }
    ] = await Promise.all([
      jarvisService.generateExecutiveBrief(userId).catch(err => { console.log('generateExecutiveBrief error:', err); return null; }),
      goalManagerService.getActiveGoals(userId).catch(err => { console.log('getActiveGoals error:', err); return []; }),
      projectStateService.getActiveProjects(userId).catch(err => { console.log('getActiveProjects error:', err); return []; }),
      priorityEngine.determineNextAction(userId).catch(err => { console.log('determineNextAction error:', err); return null; }),
      blockerDetectionService.detectBlockers(userId).catch(err => { console.log('detectBlockers error:', err); return []; }),
      jarvisRecommendationService.getLatestRecommendations(userId).catch(err => { console.log('getLatestRecommendations error:', err); return []; }),
      createAdminClient().from('milestone_tasks').select('*, milestone:project_milestones(project_id, goal_id)'),
      createAdminClient().from('agent_tasks').select('*')
    ]);

    console.log('executiveBrief:', executiveBrief);
    console.log('activeGoals:', activeGoals);

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
        currentFocus: executiveBrief?.goal_summary || 'No focus set',
        highestPriorityGoal: activeGoals[0] || null,
        highestPriorityProject: activeProjects[0] || null,
        nextBestAction: nextAction || { nextAction: executiveBrief?.next_recommended_action || 'No action recommended', reason: executiveBrief?.priority_reason || '' },
        activeBlockers: executiveBrief?.blocked_items || blockers || [],
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
