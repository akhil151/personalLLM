import { createClient } from '@/lib/supabase-server';

/**
 * ExecutionTracing provides the data for the Visualization UI.
 * 
 * COGNITIVE TRANSPARENCY:
 * In autonomous systems, trust is built through visibility. 
 * By tracing every event, state transition, and tool call, 
 * we allow the user to "see inside" the AI's mind.
 */
export const executionTracing = {
  /**
   * Fetches the full event history for a workflow run.
   */
  async getTrace(runId: string) {
    const supabase = await createClient();

    const { data: events, error } = await supabase
      .from('workflow_events')
      .select('*')
      .eq('workflow_run_id', runId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const { data: snapshots } = await supabase
      .from('workflow_snapshots')
      .select('*')
      .eq('workflow_run_id', runId)
      .order('step_index', { ascending: true });

    return {
      events,
      snapshots
    };
  }
};
