
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { embeddingService } from '../services/memory/embeddingService';
import { orchestratorService } from '../orchestrator/orchestratorService';
import { providerRouter } from '../providers/providerRouter';
import { createAdminClient } from '../lib/supabase-admin';
import '../agents'; // Register agents

const TEST_USER_ID = '734a3720-5908-429d-bef9-89c66c5adc17'; // From certification_full_agent.ts

async function runMinimalCertification() {
  console.log('PHASE Z.4.2.C — MINIMAL GO/NO-GO CERTIFICATION');
  console.log('==============================================\n');

  const report = {
    embeddings: 'FAIL',
    planner: 'FAIL',
    research: 'FAIL',
    executor: 'FAIL',
    failover: 'FAIL',
    dbIntegrity: 'FAIL',
    blockers: [] as string[],
    runtimes: {} as Record<string, number>
  };

  const supabase = createAdminClient();

  // 0. SETUP: Create a real conversation and run for testing
  console.log('[0/4] Setting up test data...');
  let conversationId: string;
  let runId: string;
  try {
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert([{ title: 'Certification Test', user_id: TEST_USER_ID }])
      .select()
      .single();
    if (convError) throw convError;
    conversationId = conv.id;

    const { data: run, error: runError } = await supabase
      .from('agent_runs')
      .insert([{
        user_id: TEST_USER_ID,
        conversation_id: conversationId,
        goal: 'Minimal Certification Run',
        status: 'running'
      }])
      .select()
      .single();
    if (runError) throw runError;
    runId = run.id;
    console.log(`  ✅ Setup complete. Run ID: ${runId}`);
  } catch (err: any) {
    console.error('  ❌ Setup failed:', err.message);
    report.blockers.push(`Setup Failure: ${err.message}`);
    return; // Cannot continue without DB setup
  }

  // 1. EMBEDDING CHECK
  console.log('\n[1/4] Checking Ollama Embeddings...');
  try {
    const start = Date.now();
    // Directly test OllamaProvider to see details
    const ollama = new (await import('../providers/OllamaProvider')).OllamaProvider();
    
    // Diagnostic: Check models
    try {
      const modelsRes = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/tags`);
      if (modelsRes.ok) {
        const models = await modelsRes.json();
        console.log('  Models available:', models.models?.map((m: any) => m.name).join(', '));
      }
    } catch (e) {}

    let vector;
    try {
      vector = await ollama.embed('Test embedding request');
      if (vector && vector.length > 0) {
        report.embeddings = 'PASS';
        console.log('  ✅ Embeddings work.');
      } else {
        report.embeddings = 'DEGRADED';
        console.log('  ⚠️ Ollama embedding returned empty vector.');
      }
    } catch (err: any) {
      report.embeddings = 'DEGRADED';
      console.log(`  ⚠️ Embeddings DEGRADED: ${err.message}`);
    }
    report.runtimes.embeddings = Date.now() - start;
  } catch (err: any) {
    console.error('  ❌ Embedding logic failure:', err.message);
    report.embeddings = 'FAIL';
    report.blockers.push(`Embedding logic failure: ${err.message}`);
  }

  // 2. AGENT HEALTH CHECK
  console.log('\n[2/4] Checking Agent Health...');
  
  // Helper to run agent
  const runAgent = async (role: string, data: any) => {
    const start = Date.now();
    try {
      const result = await orchestratorService.dispatch(role as any, {
        runId: runId, // Use real runId
        userId: TEST_USER_ID,
        conversationId: conversationId, // Use real conversationId
        data
      });
      const runtime = Date.now() - start;
      return { success: result.success, runtime, error: result.error };
    } catch (err: any) {
      return { success: false, runtime: Date.now() - start, error: err.message };
    }
  };

  // Planner
  const plannerRes = await runAgent('planner', { goal: 'Test minimal planning' });
  report.planner = plannerRes.success ? 'PASS' : 'FAIL';
  report.runtimes.planner = plannerRes.runtime;
  if (!plannerRes.success) report.blockers.push(`Planner Failure: ${plannerRes.error}`);
  console.log(`  Planner: ${report.planner} (${plannerRes.runtime}ms)`);

  // Research
  const researchRes = await runAgent('research', { topic: 'Minimal research test' });
  report.research = researchRes.success ? 'PASS' : 'FAIL';
  report.runtimes.research = researchRes.runtime;
  if (!researchRes.success) report.blockers.push(`Research Failure: ${researchRes.error}`);
  console.log(`  Research: ${report.research} (${researchRes.runtime}ms)`);

  // Executor
  const executorRes = await runAgent('executor', { task: { title: 'Test execution', description: 'Just a test' } });
  report.executor = executorRes.success ? 'PASS' : 'FAIL';
  report.runtimes.executor = executorRes.runtime;
  if (!executorRes.success) report.blockers.push(`Executor Failure: ${executorRes.error}`);
  console.log(`  Executor: ${report.executor} (${executorRes.runtime}ms)`);

  // 3. FAILOVER CHECK
  console.log('\n[3/4] Checking Failover (Ollama -> Groq)...');
  try {
    const originalUrl = process.env.OLLAMA_BASE_URL;
    process.env.OLLAMA_BASE_URL = 'http://localhost:9999'; // Invalid port
    
    // Create a NEW router to pick up the broken URL
    const { ProviderRouter } = await import('../providers/providerRouter');
    const failoverRouter = new ProviderRouter();
    
    const start = Date.now();
    // Use a simple prompt. Groq should handle it.
    const result = await failoverRouter.generate('simple', [{ role: 'user', content: 'Say failover works' }]);
    
    if (result && result.content) {
      report.failover = 'PASS';
      console.log('  ✅ Failover to Groq successful.');
    } else {
      report.blockers.push('Failover failed to return content.');
    }
    report.runtimes.failover = Date.now() - start;
    
    // Restore
    process.env.OLLAMA_BASE_URL = originalUrl;
  } catch (err: any) {
    console.error('  ❌ Failover failed:', err.message);
    report.blockers.push(`Failover Failure: ${err.message}`);
  }

  // 4. DATABASE CHECK
  console.log('\n[4/4] Checking Database Integrity...');
  try {
    const start = Date.now();
    
    // Verify run creation before task insertion
    // We already did this in setup, but let's do a fresh one to be explicit
    const { data: testRun, error: runError } = await supabase
      .from('agent_runs')
      .insert([{
        user_id: TEST_USER_ID,
        conversation_id: conversationId,
        goal: 'Integrity Check Fresh',
        status: 'running'
      }])
      .select()
      .single();

    if (runError) throw new Error(`Run creation failed: ${runError.message}`);

    const { data: testTask, error: taskError } = await supabase
      .from('agent_tasks')
      .insert([{
        run_id: testRun.id,
        title: 'Integrity Test Task',
        description: 'Testing FK constraints',
        status: 'pending'
      }])
      .select()
      .single();

    if (taskError) {
      throw new Error(`Task insertion failed (FK check): ${taskError.message}`);
    }

    // Cleanup fresh ones
    await supabase.from('agent_tasks').delete().eq('id', testTask.id);
    await supabase.from('agent_runs').delete().eq('id', testRun.id);

    report.dbIntegrity = 'PASS';
    report.runtimes.dbIntegrity = Date.now() - start;
    console.log('  ✅ Database integrity verified.');
  } catch (err: any) {
    console.error('  ❌ Database check failed:', err.message);
    report.blockers.push(`Database Integrity Failure: ${err.message}`);
  }

  // CLEANUP SETUP DATA
  try {
    // Delete messages created by agents (they use the same runId)
    await supabase.from('agent_messages').delete().eq('run_id', runId);
    await supabase.from('agent_tasks').delete().eq('run_id', runId);
    await supabase.from('execution_steps').delete().eq('run_id', runId);
    await supabase.from('agent_runs').delete().eq('id', runId);
    await supabase.from('conversations').delete().eq('id', conversationId);
    console.log('\n[CLEANUP] Test data removed.');
  } catch (err) {
    console.warn('\n[CLEANUP] Failed to remove some test data:', err);
  }

  // FINAL OUTPUT
  console.log('\n==============================================');
  console.log('GO / NO-GO REPORT');
  console.log('==============================================');
  console.log(`Embeddings:         ${report.embeddings}`);
  console.log(`Planner:            ${report.planner}`);
  console.log(`Research:           ${report.research}`);
  console.log(`Executor:           ${report.executor}`);
  console.log(`Failover:           ${report.failover}`);
  console.log(`Database Integrity: ${report.dbIntegrity}`);
  
  console.log('\nBLOCKERS:');
  if (report.blockers.length === 0) {
    console.log('  None');
  } else {
    report.blockers.forEach(b => console.log(`  - ${b}`));
  }

  const isGo = report.embeddings !== 'FAIL' && 
               report.planner === 'PASS' && 
               report.research === 'PASS' && 
               report.executor === 'PASS' && 
               report.failover === 'PASS' && 
               report.dbIntegrity === 'PASS';

  console.log('\nFINAL VERDICT:');
  if (isGo) {
    console.log('  GO TO NEXT PHASE');
  } else {
    console.log('  FIX THESE ITEMS FIRST');
  }
  console.log('==============================================');
}

runMinimalCertification().catch(err => {
  console.error('Certification Script Crashed:', err);
  process.exit(1);
});
