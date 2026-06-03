import { createAdminClient } from '../lib/supabase-admin';

// FALLBACK FOR TESTING PURPOSES
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

async function findAnyUser() {
  const supabase = createAdminClient();
  const tables = ['agent_runs', 'conversations', 'background_jobs', 'workflow_runs'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('user_id').limit(1);
      if (data && data.length > 0) {
        console.log(`Found user_id in ${table}: ${data[0].user_id}`);
        return;
      }
    } catch (e) {}
  }
  console.log('No user_id found in any table.');
}

findAnyUser();
