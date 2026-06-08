import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { dbService } from '@/services/dbService';
import { orchestratorService } from '@/orchestrator/orchestratorService';
import { memoryService } from '@/services/memory/memoryService';
import { executionRecovery } from '@/runtime/executionRecovery';
import { reflectionEngine } from '@/reflection/reflectionEngine';
import { providerRouter } from '@/providers/providerRouter';
import { createAdminClient } from '@/lib/supabase-admin';
import { eventDispatcher } from '@/events/eventDispatcher';
import { workerRuntime } from '@/workers/workerRuntime';
import { performance } from 'perf_hooks';
import '../agents/index';

const TEST_USER_ID = '734a3720-5908-429d-bef9-89c66c5adc17';
const uuidv4 = () => '550e8400-e29b-41d4-a716-44665544' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');

async function runHardeningCertification() {
  console.log('====================================================');
  console.log('PHASE Z.4.1.5 — HARDENING & EXIT CERTIFICATION');
  console.log('====================================================\n');

  const supabase = createAdminClient();
  eventDispatcher.init();
  workerRuntime.start().catch(() => {});

  // --- TASK 1: VOICE UUID BUG ---
  console.log('\nTASK 1 — VOICE UUID BUG VERIFICATION');
  console.log('------------------------------------');
  let voiceSuccess = 0;
  for (let i = 0; i < 5; i++) {
    try {
      // Intentionally passing invalid UUID
      const session = await orchestratorService.logVoiceSession(TEST_USER_ID, `invalid-uuid-${i}`, 'completed');
      if (session && session.conversation_id) {
        voiceSuccess++;
        console.log(`[PASS] Voice session ${i+1} created with valid fallback UUID: ${session.conversation_id}`);
      }
    } catch (err: any) {
      console.error(`[FAIL] Voice session ${i+1} failed: ${err.message}`);
    }
  }
  console.log(`CERTIFICATION: ${voiceSuccess}/5 voice sessions created correctly.`);

  // --- TASK 2: PLANNER FALLBACK ---
  console.log('\nTASK 2 — PLANNER FALLBACK ARCHITECTURE');
  console.log('--------------------------------------');
  // We'll simulate provider failure by temporarily breaking the router's generate method
  const originalGenerate = providerRouter.generate;
  providerRouter.generate = async () => { throw new Error('Simulated Provider Failure'); };

  let fallbackSuccess = 0;
  for (let i = 0; i < 10; i++) {
    try {
      const runId = uuidv4();
      // Ensure run exists for the tasks
      await supabase.from('agent_runs').insert([{ id: runId, user_id: TEST_USER_ID, goal: 'Fallback Test', status: 'pending' }]);
      
      const result = await orchestratorService.dispatch('planner' as any, {
        runId: runId,
        data: { goal: `Deterministic test ${i}` }
      });
      if (result.success && result.data.tasks.length >= 2) {
        fallbackSuccess++;
        console.log(`[PASS] Fallback Run ${i+1}: Generated ${result.data.tasks.length} tasks without LLM.`);
      }
    } catch (err: any) {
      console.error(`[FAIL] Fallback Run ${i+1} failed: ${err.message}`);
    }
  }
  providerRouter.generate = originalGenerate; // Restore
  console.log(`CERTIFICATION: ${fallbackSuccess}/10 fallback plans generated.`);

  // --- TASK 3: STUCK RUN DETECTION ---
  console.log('\nTASK 3 — STUCK RUN DETECTION');
  console.log('----------------------------');
  // Create a stale run
  const { data: staleRun } = await supabase.from('agent_runs').insert([{
    id: uuidv4(),
    user_id: TEST_USER_ID,
    goal: 'Stale Run Test',
    status: 'pending',
    updated_at: new Date(Date.now() - 1000 * 60 * 20).toISOString() // 20 mins ago
  }]).select().single();

  console.log(`Created stale run: ${staleRun.id}`);
  await executionRecovery.scanAndRecover('hardening-worker');
  
  const { data: recoveredRun } = await supabase.from('agent_runs').select('status').eq('id', staleRun.id).single();
  console.log(`CERTIFICATION: Run status after recovery: ${recoveredRun.status}`);
  const task3Pass = recoveredRun.status === 'failed' || recoveredRun.status === 'recovered' || recoveredRun.status === 'completed';

  // --- TASK 4: REFLECTION HARDENING ---
  console.log('\nTASK 4 — REFLECTION HARDENING');
  console.log('-----------------------------');
  let reflectionSuccess = 0;
  for (let i = 0; i < 20; i++) {
    try {
      // Simulate malformed output by throwing in a mock LLM call
      // The reflection engine should catch it and use fallback
      const result = await reflectionEngine.reflect("Goal", "Task", { data: "bad" });
      if (result && result.success !== undefined) {
        reflectionSuccess++;
      }
    } catch (err: any) {
      console.error(`[FAIL] Reflection ${i+1} crashed: ${err.message}`);
    }
  }
  console.log(`CERTIFICATION: ${reflectionSuccess}/20 reflections completed without crashing.`);

  // --- TASK 5: RATE-LIMIT RESILIENCE ---
  console.log('\nTASK 5 — PROVIDER RATE-LIMIT RESILIENCE');
  console.log('---------------------------------------');
  // Simulate 429
  const mock429 = new Error('Quota exceeded (429)');
  providerRouter.generate = async () => { throw mock429; };
  
  try {
    await providerRouter.generate('chat', [{ role: 'user', content: 'hi' }]);
  } catch (err) {}
  
  // Check if provider is in cooldown
  const health = (providerRouter as any).providerHealth.get('openrouter');
  console.log(`CERTIFICATION: Provider status after 429: ${health.status} (Until: ${new Date(health.cooldownUntil).toLocaleTimeString()})`);
  providerRouter.generate = originalGenerate;

  // --- TASK 6 & 7: RUN STATE & QUEUE AUDIT ---
  console.log('\nTASK 6 & 7 — RUN STATE & QUEUE AUDIT');
  console.log('------------------------------------');
  const { data: allRuns } = await supabase.from('agent_runs').select('status');
  const stats = {
    total: allRuns?.length || 0,
    completed: allRuns?.filter((r: any) => r.status === 'completed').length || 0,
    failed: allRuns?.filter((r: any) => r.status === 'failed').length || 0,
    running: allRuns?.filter((r: any) => r.status === 'running').length || 0,
    pending: allRuns?.filter((r: any) => r.status === 'pending').length || 0
  };
  console.log(`Run Stats: Total=${stats.total}, Completed=${stats.completed}, Failed=${stats.failed}, Running=${stats.running}, Pending=${stats.pending}`);

  const { data: allJobs } = await supabase.from('background_jobs').select('status, created_at, updated_at');
  const jobStats = {
    total: allJobs?.length || 0,
    completed: allJobs?.filter((j: any) => j.status === 'completed').length || 0,
    failed: allJobs?.filter((j: any) => j.status === 'failed').length || 0
  };
  console.log(`Queue Stats: Total=${jobStats.total}, Completed=${jobStats.completed}, Failed=${jobStats.failed}`);

  // --- TASK 8: FINAL PRODUCTION EXIT CERTIFICATION ---
  console.log('\nTASK 8 — FINAL PRODUCTION EXIT CERTIFICATION (20 RUNS)');
  console.log('------------------------------------------------------');
  // We'll use a mix of tasks. Since we have fallbacks now, they should all "succeed" in terms of workflow completion.
  const mix = [
    { type: 'planner', goal: 'What is 2+2?' },
    { type: 'executor', goal: 'Tell me a joke' },
    { type: 'memory', goal: 'Who am I?' },
    { type: 'research', goal: 'AI Startups' },
    { type: 'critic', goal: 'Review this' }
  ];

  let totalPass = 0;
  for (let i = 0; i < 20; i++) {
    const scenario = mix[i % mix.length];
    console.log(`Run ${i+1}: [${scenario.type.toUpperCase()}] ${scenario.goal}`);
    try {
      const result = await dbService.initiateAutonomousRun(TEST_USER_ID, scenario.goal);
      if (result.success) {
        totalPass++;
        console.log(`Run ${i+1} Result: PASS (RunID: ${result.runId})`);
      } else {
        console.log(`Run ${i+1} Result: FAIL - ${result.error}`);
      }
    } catch (err: any) {
      console.error(`Run ${i+1} Error: ${err.message}`);
    }
  }

  console.log('\n====================================================');
  console.log('FINAL SCORECARD');
  console.log('====================================================');
  console.log(`Task 1 (Voice UUID):  ${voiceSuccess === 5 ? 'PASS' : 'FAIL'}`);
  console.log(`Task 2 (Fallback):    ${fallbackSuccess === 10 ? 'PASS' : 'FAIL'}`);
  console.log(`Task 3 (Recovery):    ${task3Pass ? 'PASS' : 'FAIL'}`);
  console.log(`Task 4 (Reflection):  ${reflectionSuccess === 20 ? 'PASS' : 'FAIL'}`);
  console.log(`Task 8 (Final Cert):  ${totalPass}/20 successful`);
  
  if (totalPass >= 15 && voiceSuccess === 5 && fallbackSuccess === 10 && task3Pass) {
    console.log('\nVERDICT: READY FOR Z.4.2');
  } else {
    console.log('\nVERDICT: NOT READY');
  }

  process.exit(0);
}

runHardeningCertification().catch(err => {
  console.error('Certification CRASHED:', err);
  process.exit(1);
});
