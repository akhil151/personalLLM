import { executionRecovery } from '../runtime/executionRecovery';
import { createAdminClient } from '../lib/supabase-admin';
import { workflowRuntime } from '../runtime/workflowRuntime';

/**
 * CONCURRENT RECOVERY VALIDATION TEST
 * 
 * Scenario:
 * - 50 workflows are "stuck" in the database.
 * - 5 workers attempt to recover them simultaneously.
 * 
 * Expectations:
 * - Every workflow is recovered exactly once.
 * - No two workers claim the same workflow.
 * - Total recovered count = 50.
 */
async function runConcurrentRecoveryTest() {
  console.log('=== STARTING CONCURRENT RECOVERY VALIDATION ===');
  const supabase = createAdminClient();
  const WORKFLOW_COUNT = 50;
  const WORKER_COUNT = 5;
  const userId = '00000000-0000-0000-0000-000000000000';

  // 1. Setup Stuck Workflows
  console.log(`Setting up ${WORKFLOW_COUNT} stuck workflows...`);
  const workflows = [];
  const tenMinsAgo = new Date(Date.now() - 1000 * 60 * 10).toISOString();

  for (let i = 0; i < WORKFLOW_COUNT; i++) {
    const sm = await workflowRuntime.startWorkflow(userId, `conv_${i}`, 'test_workflow', { goal: `Task ${i}` });
    const runId = sm.getContext().runId;
    
    // Force into stuck state
    await supabase.from('agent_runs').update({
      status: 'running',
      updated_at: tenMinsAgo,
      lease_owner: null,
      lease_expires_at: null
    }).eq('id', runId);
    
    // Create a dummy snapshot so recovery doesn't fail
    await supabase.from('workflow_snapshots').insert([{
      workflow_run_id: runId,
      state_data: { goal: `Task ${i}` },
      step_index: 0
    }]);

    workflows.push(runId);
  }

  // 2. Spawn Workers
  console.log(`Spawning ${WORKER_COUNT} workers...`);
  const workerPromises = Array.from({ length: WORKER_COUNT }).map(async (_, workerIndex) => {
    const workerId = `worker-${workerIndex}`;
    let recoveredByThisWorker = 0;

    // Each worker tries to recover as many as it can until none are left
    while (true) {
      const { data: stillStuck } = await supabase
        .from('agent_runs')
        .select('id')
        .eq('status', 'running')
        .lt('updated_at', new Date(Date.now() - 1000 * 60 * 5).toISOString())
        .limit(1);

      if (!stillStuck || stillStuck.length === 0) break;

      // Try to recover one
      const prevStatus = await supabase.from('agent_runs').select('status').eq('id', stillStuck[0].id).single();
      
      await executionRecovery.scanAndRecover(workerId);
      
      const postStatus = await supabase.from('agent_runs').select('status').eq('id', stillStuck[0].id).single();
      if (postStatus.data?.status === 'recovered') {
        recoveredByThisWorker++;
      }
      
      // Small random delay to increase interleaving
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
    }
    return { workerId, count: recoveredByThisWorker };
  });

  const results = await Promise.all(workerPromises);

  // 3. Verify Results
  console.log('\n--- Worker Results ---');
  let totalRecovered = 0;
  results.forEach(r => {
    console.log(`Worker ${r.workerId}: ${r.count} workflows recovered`);
    totalRecovered += r.count;
  });

  let successfullyRecovered = 0;
  for (const id of workflows) {
    const { data } = await supabase.from('agent_runs').select('status').eq('id', id).single();
    if (data?.status === 'recovered') successfullyRecovered++;
  }
  
  const duplicateChecks = totalRecovered === successfullyRecovered;

  console.log('\n--- Final Verdict ---');
  console.log(`Total Workflows: ${WORKFLOW_COUNT}`);
  console.log(`Total Successfully Recovered (Source of Truth): ${successfullyRecovered}`);
  console.log(`Sum of Worker Recovery Counts: ${totalRecovered}`);
  
  const pass = successfullyRecovered === WORKFLOW_COUNT && totalRecovered === WORKFLOW_COUNT;
  
  if (pass) {
    console.log('RESULT: PASS - No duplicates, no misses, all recovered safely.');
  } else {
    console.error('RESULT: FAIL - Concurrency issues detected!');
    if (totalRecovered > successfullyRecovered) {
      console.error('ERROR: Double Recovery detected (Multiple workers claimed same workflow)');
    } else if (successfullyRecovered < WORKFLOW_COUNT) {
      console.error('ERROR: Lost Workflows detected');
    }
  }

  process.exit(pass ? 0 : 1);
}

runConcurrentRecoveryTest().catch(err => {
  console.error('Test Crashed:', err);
  process.exit(1);
});
