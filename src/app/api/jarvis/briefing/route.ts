import { NextResponse } from 'next/server';
import { jarvisService } from '@/services/jarvisService';
import { goalManagerService } from '@/services/goalManagerService';
import { projectStateService } from '@/services/projectStateService';
import { priorityEngine } from '@/services/priorityEngine';
import { blockerDetectionService } from '@/services/blockerDetectionService';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = user.id;

    const executiveBrief = await jarvisService.generateExecutiveBrief(userId);
    const activeGoals = await goalManagerService.getActiveGoals(userId);
    const activeProjects = await projectStateService.getActiveProjects(userId);

    return NextResponse.json({
      goal_summary: executiveBrief.goal_summary,
      progress_percentage: executiveBrief.progress_percentage,
      active_projects_count: executiveBrief.active_projects_count,
      highest_priority: executiveBrief.highest_priority,
      priority_reason: executiveBrief.priority_reason,
      next_recommended_action: executiveBrief.next_recommended_action,
      blocked_items: executiveBrief.blocked_items,
    });
  } catch (error: any) {
    console.error('Briefing API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
