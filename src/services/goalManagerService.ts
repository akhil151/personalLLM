import { createAdminClient } from '@/lib/supabase-admin';

/**
 * GoalManagerService handles the creation and tracking of high-level goals.
 */
export const goalManagerService = {
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

  async createGoal(title: string, description?: string) {
    const supabase = await this._getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('jarvis_goals')
      .insert([{ 
        user_id: user.id, 
        title, 
        description, 
        status: 'pending', 
        progress: 0 
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateGoal(goalId: string, updates: Partial<{
    title: string;
    description: string;
    status: 'pending' | 'active' | 'completed' | 'blocked';
    progress: number;
  }>) {
    const supabase = await this._getSupabase();
    const { data, error } = await supabase
      .from('jarvis_goals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getGoals() {
    const supabase = await this._getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('jarvis_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getActiveGoal() {
    const goals = await this.getGoals();
    return goals.find((g: any) => g.status === 'active') || goals[0] || null;
  }
};
