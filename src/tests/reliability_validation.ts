import { chaosTester } from './chaos_tester';
import { SystemHealthAudit } from '../services/systemHealthAudit';

// MOCK ENV FOR TEST RUN
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-key';
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-role-key';

async function runReliabilityValidation() {
  console.log('=== PHASE Y.4: RELIABILITY VALIDATION ===\n');

  try {
    // 1. Run Health Audit
    await SystemHealthAudit.run();
    console.log('[PASS] Startup Health Audit\n');

    // 2. Run OpenAI Resilience Test
    const openaiPassed = await chaosTester.runSuiteC();
    if (!openaiPassed) throw new Error('OpenAI Resilience Test Failed');

    // 3. Run MCP Reliability Test
    const mcpPassed = await chaosTester.runSuiteH();
    if (!mcpPassed) throw new Error('MCP Reliability Test Failed');

    console.log('\n==========================================');
    console.log('VERDICT: PLATFORM IS OPERATIONALLY RELIABLE');
    console.log('==========================================');
    process.exit(0);
  } catch (err: any) {
    console.error('\n==========================================');
    console.error(`VERDICT: RELIABILITY VALIDATION FAILED`);
    console.error(`Reason: ${err.message}`);
    console.error('==========================================');
    process.exit(1);
  }
}

runReliabilityValidation();
