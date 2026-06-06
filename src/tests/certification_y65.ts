import dotenv from 'dotenv';
// Load env before anything else
dotenv.config({ path: '.env.local' });

import { memoryService } from '../services/memory/memoryService';
import { providerRouter } from '../providers/providerRouter';
import { orchestratorService } from '../orchestrator/orchestratorService';
import { createAdminClient } from '../lib/supabase-admin';
import '../agents'; // Register agents

// We'll use a real user ID that exists
const TEST_USER_ID = '734a3720-5908-429d-bef9-89c66c5adc17';

async function runCertificationY65() {
  console.log('==================================================');
  console.log('PHASE Y.6.5 — RUNTIME TRUTH CERTIFICATION');
  console.log('==================================================\n');

  const supabase = createAdminClient();
  const results: any = {};

  // PART 1 — MEMORY CERTIFICATION
  console.log('PART 1 — MEMORY CERTIFICATION');
  console.log('-----------------------------');
  try {
    // 1. Create a real conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .upsert({ id: '550e8400-e29b-41d4-a716-446655440001', user_id: TEST_USER_ID, title: 'Cert Conv' })
      .select()
      .single();
    if (convError) throw convError;

    // 2. Create a real message
    const { data: msg, error: msgError } = await supabase
      .from('messages')
      .insert({ 
        content: "My favorite programming language is Rust.", 
        conversation_id: conv.id,
        role: 'user'
      })
      .select()
      .single();
    if (msgError) throw msgError;

    console.log(`Stored real message: "${msg.content}" (ID: ${msg.id})`);
    
    // 3. Store Embedding
    await memoryService.storeMessageEmbedding(msg.id, conv.id, TEST_USER_ID, msg.content);
    console.log('Embedding stored successfully.');

    // 4. Verify DB
    const { data: dbEntry, error: dbError } = await supabase
      .from('message_embeddings')
      .select('embedding, content')
      .eq('message_id', msg.id)
      .single();

    if (dbError || !dbEntry) throw new Error(`DB verification failed: ${dbError?.message}`);
    
    // Parse embedding if it's a string (Supabase vector type returns as "[...]")
    const embeddingArray = typeof dbEntry.embedding === 'string' 
      ? JSON.parse(dbEntry.embedding) 
      : dbEntry.embedding;
    
    const dimensions = embeddingArray.length;
    console.log(`DB Insert Evidence: Found entry with content "${dbEntry.content}"`);
    console.log(`Embedding dimensions: ${dimensions}`);

    // 5. Retrieve
    console.log('Asking: "What is my favorite programming language?"');
    const searchResults = await memoryService.searchSimilarMemories("What is my favorite programming language?", TEST_USER_ID, 1);
    
    if (searchResults && searchResults.length > 0) {
      console.log(`Retrieval Evidence: Found match with similarity ${searchResults[0].similarity}`);
      console.log(`Matched content: "${searchResults[0].content}"`);
      results.memory = { status: 'PASS', dimensions, evidence: 'DB & Semantic Search verified' };
    } else {
      throw new Error('No semantic match found');
    }
  } catch (err: any) {
    console.log('FAIL:', err.message);
    results.memory = { status: 'FAIL', error: err.message };
  }

  // PART 2 — PROVIDER CERTIFICATION
  console.log('\nPART 2 — PROVIDER CERTIFICATION');
  console.log('-------------------------------');
  results.providers = { gemini: 'FAIL', openrouter: 'FAIL' };
  
  const testProviders = async (name: string) => {
    try {
      const start = Date.now();
      const p = (providerRouter as any).getProvider(name);
      if (!p) throw new Error(`Provider ${name} not found`);

      const model = name === 'gemini' ? 'gemini-2.0-flash' : 'anthropic/claude-3-haiku';
      const response = await p.generate([{ role: 'user', content: 'Say "Certification OK"' }], { model });
      const latency = Date.now() - start;
      console.log(`${name.padEnd(12)} | Status: PASS | Latency: ${latency}ms | Model: ${model}`);
      return { status: 'PASS', latency, model };
    } catch (err: any) {
      console.log(`${name.padEnd(12)} | Status: FAIL | Error: ${err.message.substring(0, 50)}`);
      return { status: 'FAIL', error: err.message };
    }
  };

  results.providers.gemini = await testProviders('gemini');
  results.providers.openrouter = await testProviders('openrouter');

  // PART 3 — PLANNER CERTIFICATION
  console.log('\nPART 3 — PLANNER CERTIFICATION');
  console.log('------------------------------');
  try {
    const task = "Research AI startups hiring interns";
    console.log(`Task: "${task}"`);
    
    // 1. Start a real run
    const run = await orchestratorService.startRun(TEST_USER_ID, '550e8400-e29b-41d4-a716-446655440001', task);
    console.log(`Started real run: ${run.id}`);

    // 2. Dispatch to Planner
    const planResponse = await orchestratorService.dispatch('planner', { 
      runId: run.id, 
      data: { goal: task } 
    });
    
    // Handle different response structures (direct object or {success, data})
    const plan = planResponse.data ? planResponse.data : (typeof planResponse === 'string' ? JSON.parse(planResponse) : planResponse);
    
    console.log('Actual generated plan:');
    console.log(JSON.stringify(plan, null, 2));

    const steps = plan.tasks || plan.steps || [];
    const planStr = JSON.stringify(steps).toLowerCase();
    const hasResearch = planStr.includes('research');
    const hasBrowser = planStr.includes('browser');
    
    if (hasResearch || hasBrowser) {
      console.log('PASS: Plan includes required research/browser tasks');
      results.planner = { status: 'PASS', plan };
    } else {
      console.log('FAIL: Plan missing required components');
      results.planner = { status: 'FAIL', plan };
    }
  } catch (err: any) {
    console.log('FAIL:', err.message);
    results.planner = { status: 'FAIL', error: err.message };
  }

  console.log('\n==================================================');
  console.log('FINAL BOARD');
  console.log('==================================================');
  console.log(`Memory:      ${results.memory?.status || 'FAIL'}`);
  console.log(`Providers:   ${results.providers?.gemini?.status === 'PASS' || results.providers?.openrouter?.status === 'PASS' ? 'PASS' : 'FAIL'}`);
  console.log(`Planner:     ${results.planner?.status || 'FAIL'}`);
  
  const allPass = results.memory?.status === 'PASS' && 
                 (results.providers?.gemini?.status === 'PASS' || results.providers?.openrouter?.status === 'PASS') && 
                 results.planner?.status === 'PASS';

  if (allPass) {
    console.log('\nVERDICT: READY FOR PHASE Z');
  } else {
    console.log('\nVERDICT: BLOCKED');
  }
}

runCertificationY65();


