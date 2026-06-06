import { orchestratorService } from './src/orchestrator/orchestratorService';
import { agentRegistry } from './src/orchestrator/agentRegistry';
import { createAdminClient } from './src/lib/supabase-admin';

// Trigger registration
import './src/agents/planner/plannerAgent';
import './src/agents/research/researchAgent';
import './src/agents/memory/memoryAgent';
import './src/agents/executor/executorAgent';
import './src/agents/critic/criticAgent';
import './src/browser/browserAgent';

async function runTest() {
  const supabase = createAdminClient();
  
  // Find valid user and conversation
  const { data: recentRun } = await supabase
    .from('agent_runs')
    .select('user_id, conversation_id')
    .limit(1)
    .single();

  if (!recentRun) {
    console.error('No existing runs found to copy IDs from.');
    process.exit(1);
  }

  const { user_id: userId, conversation_id: conversationId } = recentRun;
  const goal = 'Research AI startups hiring interns and create a report';

  console.log('--- PART 2: AGENT ORCHESTRATION TEST ---');
  const run = await orchestratorService.startRun(userId, conversationId, goal);
  console.log(`Run created: ${run.id}`);

  console.log('Dispatching to Planner...');
  const result = await orchestratorService.dispatch('planner', {
    runId: run.id,
    conversationId,
    userId,
    data: { goal }
  });

  if (!result.success) {
    console.error('Planner failed:', result.error);
    process.exit(1);
  }

  // Verify agent_runs
  const { data: runRow } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('id', run.id)
    .single();
  
  if (runRow) {
    console.log(`PASS: agent_runs row exists (ID: ${runRow.id})`);
  } else {
    console.log('FAIL: agent_runs row missing');
  }

  // Verify agent_tasks
  const { data: tasks } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('run_id', run.id);
  
  if (tasks && tasks.length > 0) {
    console.log(`PASS: Tasks generated (${tasks.length} tasks)`);
    tasks.forEach((t: any) => console.log(`- Task ID: ${t.id}, Agent: ${t.assigned_agent}, Status: ${t.status}`));
    
    // Check if Critic was injected (Part 7 requirement)
    const hasCritic = tasks.some((t: any) => t.assigned_agent === 'critic');
    if (hasCritic) {
      console.log('PASS: Critic agent task injected (Part 7 requirement met)');
    } else {
      console.log('FAIL: Critic agent task NOT injected');
    }
  } else {
    console.log('FAIL: No tasks generated');
  }

  // Store run_id for subsequent parts
  console.log(`\nTEST_RUN_ID=${run.id}`);
}

runTest().catch(console.error);
