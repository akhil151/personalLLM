import { createAdminClient } from '../lib/supabase-admin';
import { v4 as uuidv4 } from 'uuid';

// FALLBACK FOR TESTING PURPOSES
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

async function testInsert() {
  const supabase = createAdminClient();
  const userId = '00000000-0000-0000-0000-000000000000';
  
  const { data, error } = await supabase.from('agent_runs').insert([{
    user_id: userId,
    goal: 'Test Goal',
    status: 'pending'
  }]);
  
  if (error) {
    console.log(`Insert failed: ${error.message}`);
  } else {
    console.log('Insert successful!');
  }
}

testInsert();
