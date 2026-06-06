import { userIntelligenceService } from './userIntelligenceService';
import { goalManagerService } from './goalManagerService';
import { projectStateService } from './projectStateService';
import { jarvisReflectionService } from './jarvisReflectionService';

/**
 * PersonalContextService generates a unified, high-level context object.
 */
export const personalContextService = {
  /**
   * Generates the "Unified Personal Context" for the user.
   */
  async getUnifiedContext(userId: string) {
    const [profile, activeGoal, activeProject, recentReflections] = await Promise.all([
      userIntelligenceService.getUserProfile(userId),
      goalManagerService.getActiveGoal(),
      projectStateService.getActiveProject(),
      jarvisReflectionService.getLatestReflections(3)
    ]);

    const recentSuccess = recentReflections.find(r => r.what_succeeded)?.what_succeeded || "Steady progress";
    
    return {
      user: userId, // In a real app, this would be the user's name from auth
      current_focus: profile?.current_focus || "General exploration",
      learning: profile?.learning_goals || [],
      career_goal: profile?.career_goals?.[0] || "Career advancement",
      active_projects: profile?.active_projects || [activeProject?.name].filter(Boolean),
      recent_success: recentSuccess,
      next_priority: activeGoal?.title || "Define next steps"
    };
  }
};
