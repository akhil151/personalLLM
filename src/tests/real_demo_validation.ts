import { eventDispatcher } from '../events/eventDispatcher';
import { executionPipeline } from '../orchestrator/executionPipeline';
import { getTestUser, getTestConversation } from './utils';
import { workerRuntime } from '../workers/workerRuntime';

// IMPORT ALL AGENTS TO REGISTER THEM
import '../agents/index';
import '../agents/research/researchAgent';
import '../agents/critic/criticAgent';

// Use mock for DB but keep real execution for others
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
}

async function runRealDemo() {
  console.log('--- PART 7: REAL DEMO VALIDATION ---');
  console.log('Task: Research AI startups hiring interns');

  // 1. Initialize Infrastructure
  console.log('Initializing Event Dispatcher...');
  eventDispatcher.init();

  console.log('Starting Worker Runtime...');
  workerRuntime.start().catch(err => console.error('Worker Error:', err));

  const userId = await getTestUser();
  const conversationId = await getTestConversation(userId);
  const goal = "Research 3 AI startups currently hiring interns and provide their names and hiring links.";

  try {
    console.log('Starting Execution Pipeline...');
    const result = await executionPipeline.run(userId, conversationId, goal);
    
    if (result.success) {
      console.log('Demo Result: SUCCESS');
      console.log('\nRESULT: PASS');
      process.exit(0);
    } else {
      console.error(`Demo Result: FAILED - ${result.error}`);
      console.log('\nRESULT: FAIL');
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`\nRESULT: FAIL - ${err.message}`);
    process.exit(1);
  }
}

runRealDemo();
