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
   * Uses atomic claiming to ensure concurrent safety.
   */
  async scanAndRecover(workerId: string = 'recovery-worker-1') {
    const supabase = createAdminClient();
    const now = new Date();
    const timeout = new Date(now.getTime() - 1000 * 60 * 5); // 5 minutes ago
    const leaseExpiry = new Date(now.getTime() + 1000 * 60 * 2).toISOString(); // 2 minute recovery lease

    // 1. Find a candidate
    const { data: candidate, error: findError } = await supabase
      .from('agent_runs')
      .select('id')
      .eq('status', 'running')
      .lt('updated_at', timeout.toISOString())
      .or(`lease_expires_at.lt.${now.toISOString()},lease_owner.is.null`)
      .limit(1)
      .single();

    if (findError || !candidate) return;

    // 2. ATOMIC CLAIM: Claim the specific candidate
    const { data: run, error: claimError } = await supabase
      .from('agent_runs')
      .update({
        lease_owner: workerId,
        lease_expires_at: leaseExpiry,
        updated_at: now.toISOString()
      })
      .eq('id', candidate.id)
      .eq('status', 'running')
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
      }

      // 4. RELEASE LEASE (Done via checkpoint inside recover() usually, but let's be explicit if needed)
      // Actually workflowRuntime.recover calls checkpoint() which sets state to 'recovered'
      // and we should ensure checkpoint clears the lease.

    } catch (err: any) {
      console.error(`[RECOVERY] Failed to recover workflow ${run.id}:`, err.message);
      
      // RELEASE LEASE on failure so another worker can try later
      await supabase.from('agent_runs').update({
        lease_owner: null,
        lease_expires_at: null
      }).eq('id', run.id);
    }
  }
};
