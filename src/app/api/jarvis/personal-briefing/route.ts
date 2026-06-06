import { NextResponse } from 'next/server';
import { personalContextService } from '@/services/personalContextService';
import { personalRecommendationService } from '@/services/personalRecommendationService';
import { behaviorAnalyzer } from '@/services/behaviorAnalyzer';
import { userIntelligenceService } from '@/services/userIntelligenceService';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [context, recommendations, behavior, profile] = await Promise.all([
      personalContextService.getUnifiedContext(user.id),
      personalRecommendationService.getPersonalRecommendations(user.id),
      behaviorAnalyzer.getBehaviorProfile(user.id),
      userIntelligenceService.getUserProfile(user.id)
    ]);

    return NextResponse.json({
      context,
      recommendations,
      behavior,
      profile
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
