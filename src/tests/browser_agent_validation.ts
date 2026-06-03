import { BrowserAgent } from '../browser/browserAgent';
import { getTestUser } from './utils';
import { createAdminClient } from '../lib/supabase-admin';
import crypto from 'crypto';

// Use mock for DB but keep real execution for others
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
}

async function validateBrowserAgent() {
  console.log('--- PART 2: BROWSER AGENT VALIDATION ---');
  
  const userId = await getTestUser();
  const runId = crypto.randomUUID();
  const agent = new BrowserAgent();
  
  const task = {
    id: crypto.randomUUID(),
    title: 'Validate browser navigation',
    description: 'Navigate to https://example.com and describe the content.'
  };

  const input = {
    runId,
    userId,
    conversationId: crypto.randomUUID(),
    data: {
      task,
      goal: 'Verify the browser agent can navigate and perceive a page.'
    }
  };

  try {
    console.log('Executing Browser Agent...');
    const result = await agent.execute(input);
    
    if (result.success) {
      console.log('Agent Execution: SUCCESS');
      console.log(`Summary: ${result.data.summary}`);
      console.log(`Last Action: ${JSON.stringify(result.data.last_action)}`);
      console.log('\nRESULT: PASS');
      process.exit(0);
    } else {
      console.error(`Agent Execution: FAILED - ${result.error}`);
      console.log('\nRESULT: FAIL');
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`\nRESULT: FAIL - ${err.message}`);
    process.exit(1);
  }
}

validateBrowserAgent();
