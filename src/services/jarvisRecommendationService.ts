import { createAdminClient } from '../lib/supabase-admin';
import { llmService } from './llmService';
import { z } from 'zod';

const RecommendationSchema = z.object({
  recommendations: z.array(z.object({
    title: z.string(),
    reasoning: z.string(),
    impact: z.string(),
    urgency: z.string().toLowerCase().transform(val => {
      const allowed = ['low', 'medium', 'high', 'critical'];
      return allowed.includes(val) ? val : 'medium';
    }),
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
3. Potential blockers and how to avoid them.

Your response MUST be a JSON object with the following key:
- recommendations: An array of objects, each with:
  - title: String, the recommendation title
  - reasoning: String, why this recommendation is important
  - impact: String, the impact level (e.g., "High Impact", "Medium Impact")
  - urgency: String, one of "low", "medium", "high", "critical"
  - goal_id: String (optional) - ONLY include if you have a valid UUID from the provided context, otherwise omit it!
  - project_id: String (optional) - ONLY include if you have a valid UUID from the provided context, otherwise omit it!`;

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

    // 3. Store recommendations - only use goal_id and project_id that actually exist in the database
    const existingGoalIds = new Set(goals.data?.map((g: any) => g.id) || []);
    const existingProjectIds = new Set(projects.data?.map((p: any) => p.id) || []);
    const recommendationsToInsert = result.recommendations.map(r => ({
      user_id: userId,
      goal_id: (r.goal_id && existingGoalIds.has(r.goal_id)) ? r.goal_id : null,
      project_id: (r.project_id && existingProjectIds.has(r.project_id)) ? r.project_id : null,
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
