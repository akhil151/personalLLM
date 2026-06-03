import { browserRuntime } from '../browser/browserRuntime';
import crypto from 'crypto';

// Use mock for DB
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
}

async function validateSessionRecovery() {
  console.log('--- PART 3: BROWSER SESSION RECOVERY ---');
  
  const sessionId = crypto.randomUUID();
  
  try {
    // 1. Initial Navigation
    console.log('Step 1: Initial navigation to example.com...');
    await browserRuntime.navigate(sessionId, 'https://example.com');
    
    // 2. Destroy Playwright instance (Force close and remove from memory)
    console.log('Step 2: Simulating crash (closing and removing from cache)...');
    await browserRuntime.close(sessionId);
    
    // 3. Verify recovery
    console.log('Step 3: Attempting recovery by navigating to another page...');
    const result = await browserRuntime.navigate(sessionId, 'https://example.com/test');
    
    if (result.success && result.url.includes('example.com/test')) {
      console.log('Session Recovery: SUCCESS');
      console.log('\nRESULT: PASS');
      process.exit(0);
    } else {
      console.error(`Session Recovery: FAILED - Result: ${JSON.stringify(result)}`);
      console.log('\nRESULT: FAIL');
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`\nRESULT: FAIL - ${err.message}`);
    process.exit(1);
  }
}

validateSessionRecovery();
