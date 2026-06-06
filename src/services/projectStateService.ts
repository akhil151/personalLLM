import { createAdminClient } from '@/lib/supabase-admin';

/**
 * ProjectStateService tracks the overall project status and milestones.
 */
export const projectStateService = {
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

  async createProject(name: string, description?: string) {
    const supabase = await this._getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('jarvis_projects')
      .insert([{ 
        user_id: user.id, 
        name, 
        description, 
        status: 'planning', 
        progress: 0 
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProject(projectId: string, updates: Partial<{
    name: string;
    description: string;
    status: 'planning' | 'active' | 'completed' | 'on_hold';
    progress: number;
  }>) {
    const supabase = await this._getSupabase();
    const { data, error } = await supabase
      .from('jarvis_projects')
      .update({ ...updates, last_activity_at: new Date().toISOString() })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getProjects() {
    const supabase = await this._getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('jarvis_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getActiveProject() {
    const projects = await this.getProjects();
    return projects.find((p: any) => p.status === 'active') || projects[0] || null;
  }
};
