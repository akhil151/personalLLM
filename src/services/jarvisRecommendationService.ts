import { goalManagerService } from './goalManagerService';
import { projectStateService } from './projectStateService';
import { jarvisReflectionService } from './jarvisReflectionService';
import { llmService } from './llmService';
import { z } from 'zod';

const JarvisRecommendationSchema = z.object({
  suggested_next_task: z.string(),
  suggested_bug_fix: z.string().optional(),
  suggested_learning_topic: z.string().optional(),
  suggested_workflow: z.string().optional(),
  reasoning: z.string()
});

/**
 * JarvisRecommendationService synthesizes all project data to suggest next actions.
 */
export const jarvisRecommendationService = {
  /**
   * Generates proactive recommendations based on current system state.
   */
  async getRecommendations() {
    try {
      // 1. Gather Context
      const [goals, project, reflections] = await Promise.all([
        goalManagerService.getGoals(),
        projectStateService.getActiveProject(),
        jarvisReflectionService.getLatestReflections(3)
      ]);

      const context = {
        active_project: project,
        goals: goals.filter((g: any) => g.status !== 'completed'),
        recent_reflections: reflections
      };

      const systemPrompt = `You are Jarvis, a proactive project manager AI.
      Based on the current project state, goals, and recent reflections, suggest the best next actions.
      
      Structure your response as JSON:
      {
        "suggested_next_task": "The most critical task to work on now",
        "suggested_bug_fix": "A bug or technical debt item to address",
        "suggested_learning_topic": "Something the user should learn to advance the project",
        "suggested_workflow": "A process improvement or new automation idea",
        "reasoning": "Why you made these recommendations"
      }`;

      const recommendations = await llmService.getStructuredOutput([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Current Context: ${JSON.stringify(context)}` }
      ], JarvisRecommendationSchema);

      return recommendations;

    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return {
        suggested_next_task: "Continue current work",
        reasoning: "Unable to analyze complex context at this time."
      };
    }
  }
};
