import { NextResponse } from 'next/server';
import { goalManagerService } from '@/services/goalManagerService';
import { projectStateService } from '@/services/projectStateService';
import { jarvisRecommendationService } from '@/services/jarvisRecommendationService';

export async function GET() {
  try {
    const [activeGoal, activeProject, recommendations] = await Promise.all([
      goalManagerService.getActiveGoal(),
      projectStateService.getActiveProject(),
      jarvisRecommendationService.getRecommendations()
    ]);

    return NextResponse.json({
      goal: activeGoal,
      project: activeProject,
      recommendations
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
