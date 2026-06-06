import { llmService } from './llmService';
import { userIntelligenceService } from './userIntelligenceService';
import { behaviorAnalyzer } from './behaviorAnalyzer';
import { goalManagerService } from './goalManagerService';
import { z } from 'zod';

const RecommendationSchema = z.object({
  next_learning_topic: z.string(),
  next_project_milestone: z.string(),
  internship_recommendations: z.string(),
  skill_gap_analysis: z.string(),
  suggested_actions: z.array(z.string()),
  reasoning: z.string()
});

/**
 * PersonalRecommendationService generates personalized career and learning advice.
 */
export const personalRecommendationService = {
  async getPersonalRecommendations(userId: string) {
    try {
      // 1. Gather Context
      const [profile, behavior, activeGoal] = await Promise.all([
        userIntelligenceService.getUserProfile(userId),
        behaviorAnalyzer.getBehaviorProfile(userId),
        goalManagerService.getActiveGoal()
      ]);

      const context = {
        profile,
        behavior,
        active_goal: activeGoal
      };

      const systemPrompt = `You are Jarvis, the user's Personal Mentor AI.
      Based on their profile, working behavior, and active goals, generate personalized recommendations.
      
      Structure your response as JSON:
      {
        "next_learning_topic": "Specific concept or skill to study",
        "next_project_milestone": "A concrete step in their active project",
        "internship_recommendations": "Types of companies or roles that fit their profile",
        "skill_gap_analysis": "What they are missing to reach their career goals",
        "suggested_actions": ["Action 1", "Action 2"],
        "reasoning": "Explain why these fit the user's personal context"
      }`;

      const recommendations = await llmService.getStructuredOutput([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this context: ${JSON.stringify(context)}` }
      ], RecommendationSchema, userId);

      return recommendations;

    } catch (error) {
      console.error('Failed to generate personal recommendations:', error);
      return null;
    }
  }
};
