import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createAdminClient } from './src/lib/supabase-admin';
import { executionRecovery } from './src/runtime/executionRecovery';
import crypto from 'crypto';

async function auditRecovery() {
  console.log('--- PART 9: RECOVERY CERTIFICATION ---');
  
  const supabase = createAdminClient();
  const userId = '734a3720-5908-429d-bef9-89c66c5adc17';
  const runId = crypto.randomUUID();
  
  // Find valid conversation
  const { data: conv } = await supabase.from('conversations').select('id').limit(1).single();

  console.log('0. Cleaning up old stalled runs...');
  await supabase.from('agent_runs').delete().eq('status', 'running');

  console.log('1. Creating stalled workflow...');
  const fiveMinsAgo = new Date(Date.now() - 1000 * 60 * 6).toISOString();
  
  await supabase.from('agent_runs').insert({
    id: runId,
    user_id: userId,
    conversation_id: conv?.id,
    goal: 'Test recovery',
    status: 'running',
    updated_at: fiveMinsAgo
  });

  // Create a snapshot to resume from
  await supabase.from('workflow_snapshots').insert({
    run_id: runId,
    state_data: { stepIndex: 2, variables: { tasks: [{}, {}, {}, {}] } },
    step_index: 2
  });

  console.log('2. Running recovery scanner...');
  await executionRecovery.scanAndRecover('recovery-auditor');

  // Add delay for event persistence
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('3. Verifying recovery evidence...');
  const { data: run } = await supabase.from('agent_runs').select('*').eq('id', runId).single();
  const { data: events } = await supabase.from('workflow_events').select('*').eq('run_id', runId);

  if (run?.lease_owner === 'recovery-auditor') {
    console.log('PASS: Lease ownership acquired');
  } else {
    console.log(`FAIL: Lease owner is ${run?.lease_owner}`);
  }

  const recoveryEvent = events?.find((e: any) => e.event_type === 'TOOL_EXECUTED' && e.payload.recovered);
  if (recoveryEvent) {
    console.log('PASS: Workflow resumed (Recovery event found)');
    console.log(`- Resumed from step: ${recoveryEvent.payload.index + 1}`);
  } else {
    console.log('FAIL: Recovery event not found');
  }

  // Check if it started from beginning
  if (recoveryEvent && recoveryEvent.payload.index > 0) {
    console.log('PASS: Recovery did NOT restart from beginning');
  } else {
    console.log('FAIL: Recovery restarted from beginning or no event');
  }
}

auditRecovery().catch(console.error);
