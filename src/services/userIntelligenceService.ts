import { createAdminClient } from '@/lib/supabase-admin';

/**
 * UserIntelligenceService manages the dynamic user model.
 */
export const userIntelligenceService = {
  async _getSupabase() {
    if (typeof window === 'undefined') {
      try {
        const { createClient } = await import('@/lib/supabase-server');
        return await createClient();
      } catch (err) {
        // Background context fallback
        return createAdminClient();
      }
    } else {
      const { createClient } = await import('@/lib/supabase');
      return createClient();
    }
  },

  /**
   * Retrieves the user's intelligence profile.
   */
  async getUserProfile(userId: string) {
    const supabase = await this._getSupabase();
    const { data, error } = await supabase
      .from('jarvis_user_profile')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Updates or creates the user's intelligence profile.
   */
  async updateUserProfile(userId: string, updates: any) {
    const supabase = await this._getSupabase();
    const { data, error } = await supabase
      .from('jarvis_user_profile')
      .upsert({
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Bootstraps a new user profile if it doesn't exist.
   */
  async bootstrapProfile(userId: string) {
    const profile = await this.getUserProfile(userId);
    if (profile) return profile;

    console.log(`[USER_INTEL] Bootstrapping profile for user ${userId}`);
    
    // 1. Initial Profile
    const newProfile = await this.updateUserProfile(userId, {
      current_focus: 'Initializing...',
      learning_goals: [],
      career_goals: [],
      preferred_domains: [],
      preferred_tools: [],
      summary: 'New user profile created.'
    });

    // 2. Trigger initial memory extraction if conversation exists
    const { userMemoryExtractor } = await import('./userMemoryExtractor');
    await userMemoryExtractor.extractAndStoreProfile(userId);

    return newProfile;
  }
};
