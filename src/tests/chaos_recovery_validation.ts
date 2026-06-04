import { executionRecovery } from '../runtime/executionRecovery';
import { createAdminClient } from '../lib/supabase-admin';
import { workflowRuntime } from '../runtime/workflowRuntime';

/**
 * CHAOS RECOVERY VALIDATION TEST
 * 
 * Scenario:
 * 1. A workflow is stuck.
 * 2. Worker A claims it but CRASHES before completion.
 * 3. Verify lease is released (or expires).
 * 4. Worker B claims it and completes recovery.
 */
async function runChaosRecoveryTest() {
  console.log('=== STARTING CHAOS RECOVERY VALIDATION ===');
  const supabase = createAdminClient();
  const userId = '00000000-0000-0000-0000-000000000000';
  const tenMinsAgo = new Date(Date.now() - 1000 * 60 * 10).toISOString();

  // 1. Setup Stuck Workflow
  console.log('Setting up stuck workflow...');
  const sm = await workflowRuntime.startWorkflow(userId, 'conv_chaos', 'test_workflow', { goal: 'Chaos Task' });
  const runId = sm.getContext().runId;
  
  await supabase.from('agent_runs').update({
    status: 'running',
    updated_at: tenMinsAgo
  }).eq('id', runId);
  
  await supabase.from('workflow_snapshots').insert([{
    workflow_run_id: runId,
    state_data: { goal: 'Chaos Task' },
    step_index: 0
  }]);

  // 2. Worker A Claims and "Crashes"
  console.log('Worker A attempting recovery and "crashing"...');
  
  // We simulate a crash by manually claiming it but not calling the recovery logic
  // OR we can mock workflowRuntime.recover to throw.
  const originalRecover = workflowRuntime.recover;
  workflowRuntime.recover = async () => { throw new Error('WORKER_CRASH_SIMULATION'); };

  await executionRecovery.scanAndRecover('worker-A');

  // Verify Worker A lease exists but recovery failed
  const { data: runAfterA } = await supabase.from('agent_runs').select('*').eq('id', runId).single();
  const leaseReleased = runAfterA.lease_owner === null;
  console.log('Status after Worker A "crash":', runAfterA.status);
  console.log('Lease released on error:', leaseReleased ? 'YES' : 'NO');

  // RESET updated_at so Worker B can claim it immediately
  await supabase.from('agent_runs').update({
    updated_at: tenMinsAgo
  }).eq('id', runId);

  // 3. Restore and Recover with Worker B
  console.log('Worker B attempting recovery...');
  workflowRuntime.recover = originalRecover;

  await executionRecovery.scanAndRecover('worker-B');

  const { data: runAfterB } = await supabase.from('agent_runs').select('*').eq('id', runId).single();
  const recoveredByB = runAfterB.status === 'recovered';
  console.log('Status after Worker B recovery:', runAfterB.status);
  console.log('Recovered by B:', recoveredByB ? 'YES' : 'NO');

  const pass = leaseReleased && recoveredByB;
  
  console.log('\n--- Final Verdict ---');
  if (pass) {
    console.log('RESULT: PASS - System stabilized after simulated crash.');
  } else {
    console.error('RESULT: FAIL - Recovery failed after crash.');
  }

  process.exit(pass ? 0 : 1);
}

runChaosRecoveryTest().catch(err => {
  console.error('Test Crashed:', err);
  process.exit(1);
});
