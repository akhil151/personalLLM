import { createAdminClient } from '../lib/supabase-admin';
import { llmService } from './llmService';
import { z } from 'zod';

const RecommendationSchema = z.object({
  recommendations: z.array(z.object({
    title: z.string(),
    reasoning: z.string(),
    impact: z.string(),
    urgency: z.enum(['low', 'medium', 'high', 'critical']),
    goal_id: z.string().optional(),
    project_id: z.string().optional()
  }))
});

/**
 * JarvisRecommendationService generates proactive guidance based on the user's current state.
 */
export const jarvisRecommendationService = {
  /**
   * Generates proactive recommendations.
   */
  async generateProactiveRecommendations(userId: string) {
    const supabase = createAdminClient();
    
    // 1. Gather context
    const [goals, projects, recentMessages] = await Promise.all([
      supabase.from('user_goals').select('*').eq('user_id', userId).eq('status', 'active'),
      supabase.from('user_projects').select('*, milestones:project_milestones(*)').eq('user_id', userId).eq('status', 'active'),
      supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(20)
    ]);

    // 2. Prepare LLM prompt
    const systemPrompt = `You are Jarvis, a Chief of Staff AI. Your mission is to provide proactive, high-impact recommendations to the user.
Analyze their goals, projects, and recent activity to identify:
1. Immediate next actions for stalled projects.
2. New opportunities aligned with their goals.
3. Potential blockers and how to avoid them.`;

    const userPrompt = `Context:
Active Goals: ${JSON.stringify(goals.data)}
Active Projects: ${JSON.stringify(projects.data)}
Recent Activity: ${JSON.stringify(recentMessages.data)}

Generate 3-5 high-quality recommendations.`;

    const result = await llmService.getStructuredOutput(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      RecommendationSchema,
      userId,
      'recommendation-generation'
    );

    // 3. Store recommendations
    const recommendationsToInsert = result.recommendations.map(r => ({
      user_id: userId,
      goal_id: r.goal_id,
      project_id: r.project_id,
      title: r.title || 'New Recommendation',
      reasoning: r.reasoning || 'Based on your current goals and activity.',
      impact: r.impact || 'High Impact',
      urgency: r.urgency || 'medium',
      status: 'pending'
    }));

    const { data, error } = await supabase
      .from('jarvis_recommendations')
      .insert(recommendationsToInsert)
      .select();

    if (error) throw error;
    return data;
  },

  /**
   * Fetches the latest recommendations for the user.
   */
  async getLatestRecommendations(userId: string, limit = 5) {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('jarvis_recommendations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};
