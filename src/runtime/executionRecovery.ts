import { createAdminClient } from '@/lib/supabase-admin';
import { workflowRuntime } from './workflowRuntime';
import { eventBus } from '@/events/eventBus';
import { observabilityService } from '@/services/observability/observabilityService';

/**
 * ExecutionRecovery handles the "Self-Healing" aspect of the runtime.
 */
export const executionRecovery = {
  /**
   * Scans for workflows that have been 'running' for too long without updates.
   */
  async scanAndRecover() {
    const supabase = createAdminClient();
    const timeout = new Date(Date.now() - 1000 * 60 * 5); // 5 minutes ago

    const { data: stuckRuns, error } = await supabase
      .from('agent_runs')
      .select('id, metadata')
      .eq('status', 'running')
      .lt('updated_at', timeout.toISOString());

    if (error) {
      console.error('[RECOVERY] Scan Error:', error);
      return;
    }

    if (stuckRuns.length === 0) return;

    console.log(`[RECOVERY] Found ${stuckRuns.length} stuck workflows. Initiating recovery...`);

    for (const run of stuckRuns) {
      try {
        const sm = await workflowRuntime.recover(run.id);
        const context = sm.getContext();
        
        await observabilityService.logRecoveryEvent(run.id, `Stuck at step ${context.stepIndex}. Resuming...`);

        const lastIndex = context.stepIndex - 1;
        const total = context.variables.tasks?.length || 0;

        if (context.stepIndex < total) {
          await eventBus.publish(run.id, 'TOOL_EXECUTED', { 
            index: lastIndex, 
            total, 
            runId: run.id,
            recovered: true
          });
        } else if (total > 0) {
          await eventBus.publish(run.id, 'WORKFLOW_COMPLETED', { runId: run.id });
        }

      } catch (err) {
        console.error(`[RECOVERY] Failed to recover workflow ${run.id}:`, err);
      }
    }
  }
};
