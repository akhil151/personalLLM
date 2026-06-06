import { createAdminClient } from '@/lib/supabase-admin';

/**
 * JarvisService provides the high-level intelligence layer for the Jarvis identity.
 * It manages persistent state and routes intent-based commands to the underlying
 * autonomous infrastructure.
 */
export const jarvisService = {
  /**
   * Internal helper to get the correct Supabase client.
   */
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
   * Retrieves the current state of Jarvis for the authenticated user.
   */
  async getState() {
    const supabase = await this._getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('jarvis_state')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "No rows found"
    
    // Return default state if none exists
    return data || {
      user_id: user.id,
      current_project: 'Uninitialized',
      active_goal: 'Waiting for instructions',
      last_session_summary: 'No previous sessions found.'
    };
  },

  /**
   * Updates the Jarvis state.
   */
  async updateState(updates: Partial<{
    current_project: string;
    active_goal: string;
    last_session_summary: string;
    context_metadata: any;
  }>) {
    const supabase = await this._getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
      .from('jarvis_state')
      .upsert({
        user_id: user.id,
        ...updates,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  },

  /**
   * Command Router: Interprets natural language commands and returns structured data.
   */
  async routeCommand(command: string) {
    const cmd = command.toLowerCase().trim();

    if (cmd.includes('continue work')) {
      return await this._handleContinueWork();
    } else if (cmd.includes('project status')) {
      return await this._handleProjectStatus();
    } else if (cmd.includes('what are we building')) {
      return await this._handleWhatAreWeBuilding();
    } else if (cmd.includes('next steps')) {
      return await this._handleNextSteps();
    }

    return {
      type: 'unknown',
      message: "I'm sorry, I don't recognize that command. Try 'project status' or 'next steps'."
    };
  },

  async _handleContinueWork() {
    const supabase = await this._getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: lastRun } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!lastRun) return { type: 'info', message: "No previous work found to continue." };

    return {
      type: 'resume',
      message: `Resuming work on your last goal: "${lastRun.goal}"`,
      run: lastRun
    };
  },

  async _handleProjectStatus() {
    const supabase = await this._getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: activeRun } = await supabase
      .from('agent_runs')
      .select('*, agent_tasks(*)')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!activeRun) return { type: 'info', message: "No active project found." };

    const completed = activeRun.agent_tasks?.filter((t: any) => t.status === 'completed').length || 0;
    const total = activeRun.agent_tasks?.length || 0;

    return {
      type: 'status',
      message: `Current Project Status: ${completed}/${total} tasks completed.`,
      details: {
        goal: activeRun.goal,
        tasks: activeRun.agent_tasks
      }
    };
  },

  async _handleWhatAreWeBuilding() {
    const state = await this.getState();
    return {
      type: 'identity',
      message: `We are currently building: ${state.current_project}. Our active goal is: ${state.active_goal}`
    };
  },

  async _handleNextSteps() {
    const supabase = await this._getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: activeRun } = await supabase
      .from('agent_runs')
      .select('*, agent_tasks(*)')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!activeRun) return { type: 'info', message: "No active project found to determine next steps." };

    const nextTasks = activeRun.agent_tasks?.filter((t: any) => t.status === 'pending')
      .sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 3);

    return {
      type: 'steps',
      message: nextTasks.length > 0 
        ? `Here are the next steps for "${activeRun.goal}":`
        : "All current tasks are completed or in progress.",
      steps: nextTasks
    };
  }
};
