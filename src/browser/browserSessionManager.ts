import { createClient } from '@/lib/supabase-server';

/**
 * BrowserSessionManager handles the lifecycle of browser execution sessions.
 * 
 * WHY SESSION MANAGEMENT?
 * Autonomous browser agents need persistent sessions to:
 * 1. Maintain login states across multiple pages.
 * 2. Keep track of navigation history for backtracking.
 * 3. Provide a sandboxed environment for specific tasks.
 */
export const browserSessionManager = {
  async createSession(userId: string, runId?: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('browser_sessions')
      .insert([{
        user_id: userId,
        workflow_run_id: runId,
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;
    console.log(`Browser Session Created: ${data.id}`);
    return data;
  },

  async closeSession(sessionId: string) {
    const supabase = await createClient();
    await supabase
      .from('browser_sessions')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    
    console.log(`Browser Session Closed: ${sessionId}`);
  },

  async getActiveSession(userId: string, runId: string) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('browser_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('workflow_run_id', runId)
      .eq('status', 'active')
      .single();
    
    return data;
  }
};
