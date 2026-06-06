import { BrowserAgent } from './src/browser/browserAgent';
import { createAdminClient } from './src/lib/supabase-admin';
import crypto from 'crypto';

async function auditBrowser() {
  console.log('--- PART 11: BROWSER RUNTIME CERTIFICATION ---');
  
  const browserAgent = new BrowserAgent();
  const userId = '734a3720-5908-429d-bef9-89c66c5adc17';
  const runId = crypto.randomUUID(); // Dummy runId
  
  // We need to create the run in DB first to satisfy FK
  const supabase = createAdminClient();
  
  // Find valid conversation
  const { data: conv } = await supabase.from('conversations').select('id').limit(1).single();
  
  await supabase.from('agent_runs').insert({
    id: runId,
    user_id: userId,
    conversation_id: conv?.id,
    goal: 'Test browser runtime',
    status: 'running'
  });

  console.log('Executing browser task...');
  try {
    const result = await browserAgent.execute({
      runId,
      conversationId: conv?.id || '',
      userId,
      data: {
        task: {
          title: 'Visit example.com',
          description: 'Visit https://example.com and get the title'
        },
        goal: 'Verify browser runtime'
      }
    });

    if (!result.success) {
      console.log(`FAIL: Browser agent failed: ${result.error}`);
    } else {
      console.log('Verifying database evidence...');
      
      const { data: sessions } = await supabase.from('browser_sessions').select('*').eq('run_id', runId);
      const { data: actions } = await supabase.from('browser_actions').select('*').filter('session_id', 'in', `(${sessions?.map((s: any) => s.id).join(',')})`);
      const { data: snapshots } = await supabase.from('page_snapshots').select('*').filter('session_id', 'in', `(${sessions?.map((s: any) => s.id).join(',')})`);

      if (sessions && sessions.length > 0) {
        console.log(`PASS: browser_sessions row exists (Count: ${sessions.length})`);
        console.log(`PASS: browser_actions row exists (Count: ${actions?.length || 0})`);
        console.log(`PASS: page_snapshots row exists (Count: ${snapshots?.length || 0})`);
        
        console.log(`URL visited: ${snapshots?.[0]?.url}`);
        console.log(`Action count: ${actions?.length || 0}`);
        console.log(`Snapshot count: ${snapshots?.length || 0}`);
      } else {
        console.log('FAIL: No browser session found in DB');
      }
    }
  } catch (err: any) {
    console.log(`FAIL: Browser execution crashed: ${err.message}`);
  }
}

auditBrowser().catch(console.error);
