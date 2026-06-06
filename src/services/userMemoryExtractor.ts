import { llmService } from './llmService';
import { userIntelligenceService } from './userIntelligenceService';
import { createAdminClient } from '@/lib/supabase-admin';
import { z } from 'zod';

const UserMemorySchema = z.object({
  current_focus: z.string(),
  learning_goals: z.array(z.string()),
  career_goals: z.array(z.string()),
  preferred_domains: z.array(z.string()),
  preferred_tools: z.array(z.string()),
  active_projects: z.array(z.string()),
  summary: z.string()
});

/**
 * UserMemoryExtractor analyzes user activity to synthesize the personal intelligence profile.
 */
export const userMemoryExtractor = {
  async _getSupabase() {
    if (typeof window === 'undefined') {
      try {
        const { createClient } = await import('@/lib/supabase-server');
        return await createClient();
      } catch (err) {
        return createAdminClient();
      }
    } else {
      const { createClient } = await import('@/lib/supabase');
      return createClient();
    }
  },

  /**
   * Triggers a profile update by analyzing recent logs.
   */
  async extractAndStoreProfile(userId: string) {
    const supabase = await this._getSupabase();

    // 1. Fetch data for analysis
    const [conversations, runs, reflections] = await Promise.all([
      supabase.from('messages').select('content, role').order('created_at', { ascending: false }).limit(20),
      supabase.from('agent_runs').select('goal, status').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      supabase.from('jarvis_reflections').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)
    ]);

    const context = {
      recent_messages: conversations.data,
      recent_runs: runs.data,
      recent_reflections: reflections.data
    };

    const systemPrompt = `You are Jarvis's Personal Intelligence Engine. 
    Analyze the provided logs to update the user's personal profile.
    
    Extract:
    - current_focus: What the user is currently spending most time on.
    - learning_goals: Skills or topics the user is trying to master.
    - career_goals: Long-term professional objectives mentioned or implied.
    - preferred_domains: Industries or areas of interest (e.g., AI, Web3, FinTech).
    - preferred_tools: Technologies or tools the user frequently uses.
    - active_projects: Specific projects the user is building.
    - summary: A concise 2-3 sentence overview of the user's current state.

    Return JSON:
    {
      "current_focus": "...",
      "learning_goals": ["...", "..."],
      "career_goals": ["...", "..."],
      "preferred_domains": ["...", "..."],
      "preferred_tools": ["...", "..."],
      "active_projects": ["...", "..."],
      "summary": "..."
    }`;

    try {
      const result = await llmService.getStructuredOutput([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this context: ${JSON.stringify(context)}` }
      ], UserMemorySchema, userId);

      // 2. Update Profile
      await userIntelligenceService.updateUserProfile(userId, result);
      return result;

    } catch (error) {
      console.error('Failed to extract user memory:', error);
      return null;
    }
  }
};
