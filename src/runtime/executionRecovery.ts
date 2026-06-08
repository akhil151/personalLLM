import { createAdminClient } from '@/lib/supabase-admin';
import { workflowRuntime } from './workflowRuntime';
import { eventBus } from '@/events/eventBus';
import { observabilityService } from '@/services/observability/observabilityService';

/**
 * ExecutionRecovery handles the "Self-Healing" aspect of the runtime.
 */
export const executionRecovery = {
  /**
   * Scans for workflows that have been 'running' or 'pending' for too long without updates.
   * Uses atomic claiming to ensure concurrent safety.
   */
  async scanAndRecover(workerId: string = 'recovery-worker-1') {
    const supabase = createAdminClient();
    const now = new Date();
    
    // PHASE Z.4.1.5: 15-minute stale threshold
    const timeout = new Date(now.getTime() - 1000 * 60 * 15); 
    const leaseExpiry = new Date(now.getTime() + 1000 * 60 * 5).toISOString(); // 5 minute recovery lease

    // 1. Find a candidate (including 'pending' and 'running')
    const { data: candidate, error: findError } = await supabase
      .from('agent_runs')
      .select('id, status')
      .in('status', ['running', 'pending'])
      .lt('updated_at', timeout.toISOString())
      .or(`lease_expires_at.lt.${now.toISOString()},lease_owner.is.null`)
      .limit(1)
      .single();

    if (findError || !candidate) return;

    console.log(`[RECOVERY] Found stale workflow ${candidate.id} (${candidate.status}). Attempting to claim...`);

    // 2. ATOMIC CLAIM: Claim the specific candidate
    const { data: run, error: claimError } = await supabase
      .from('agent_runs')
      .update({
        lease_owner: workerId,
        lease_expires_at: leaseExpiry,
        updated_at: now.toISOString()
      })
      .eq('id', candidate.id)
      .in('status', ['running', 'pending'])
      .or(`lease_expires_at.lt.${now.toISOString()},lease_owner.is.null`)
      .select()
      .single();

    if (claimError) {
      if (claimError.code !== 'PGRST116') {
        console.error('[RECOVERY] Claim Error:', claimError);
      }
      return;
    }

    console.log(`[RECOVERY] Claimed workflow ${run.id}. Initiating recovery...`);

    try {
      // 2. RECOVER WORKFLOW (Rehydration + Resumption)
      const sm = await workflowRuntime.recover(run.id);
      const context = sm.getContext();
      
      await observabilityService.logRecoveryEvent(run.id, `Claimed by ${workerId}. Resuming from step ${context.stepIndex}.`);

      const lastIndex = context.stepIndex - 1;
      const total = context.variables.tasks?.length || 0;

      // 3. SIGNAL RESUMPTION
      if (context.stepIndex < total) {
        await eventBus.publish(run.id, 'TOOL_EXECUTED', { 
          index: lastIndex, 
          total, 
          runId: run.id,
          recovered: true,
          claimedBy: workerId
        });
      } else if (total > 0) {
        await eventBus.publish(run.id, 'WORKFLOW_COMPLETED', { runId: run.id });
      } else {
        // If pending with no tasks, it might have failed during planning
        console.log(`[RECOVERY] Workflow ${run.id} has no tasks. Failing cleanly.`);
        sm.transitionTo('failed');
        await workflowRuntime.checkpoint(sm);
      }

    } catch (err: any) {
      console.error(`[RECOVERY] Failed to recover workflow ${run.id}:`, err.message);
      
      // RELEASE LEASE and mark as failed if it's truly stuck
      await supabase.from('agent_runs').update({
        status: 'failed',
        lease_owner: null,
        lease_expires_at: null,
        metadata: { recovery_error: err.message }
      }).eq('id', run.id);
    }
  }
};
