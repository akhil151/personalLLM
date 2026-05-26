import { createClient } from '@/lib/supabase-server';
import { workflowRuntime } from './workflowRuntime';

/**
 * ExecutionRecovery handles the "Self-Healing" aspect of the runtime.
 * 
 * FAULT TOLERANCE:
 * In a distributed system, servers fail. Workflows might get "stuck" in a 'running' state.
 * This service monitors for timed-out or failed workflows and attempts to restart them 
 * from their last successful checkpoint.
 */
export const executionRecovery = {
  /**
   * Scans for workflows that have been 'running' for too long without updates.
   */
  async scanAndRecover() {
    const supabase = await createClient();
    const timeout = new Date(Date.now() - 1000 * 60 * 5); // 5 minutes ago

    const { data: stuckRuns, error } = await supabase
      .from('workflow_runs')
      .select('id')
      .eq('status', 'running')
      .lt('updated_at', timeout.toISOString());

    if (error) {
      console.error('Recovery Scan Error:', error);
      return;
    }

    console.log(`Found ${stuckRuns.length} stuck workflows. Initiating recovery...`);

    for (const run of stuckRuns) {
      try {
        const sm = await workflowRuntime.recover(run.id);
        console.log(`Recovered workflow ${run.id}. Resuming...`);
        // Here we would trigger the dispatcher to resume the specific workflow type
      } catch (err) {
        console.error(`Failed to recover workflow ${run.id}:`, err);
      }
    }
  }
};
