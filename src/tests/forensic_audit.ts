import 'dotenv/config';
import { createAdminClient } from '../lib/supabase-admin';

async function forensicAudit() {
  // Manual override for environment variables since we are running in a script
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
     const fs = require('fs');
     const path = require('path');
     const envPath = path.resolve(process.cwd(), '.env.local');
     if (fs.existsSync(envPath)) {
       const envFile = fs.readFileSync(envPath, 'utf8');
       envFile.split('\n').forEach((line: string) => {
         const [key, value] = line.split('=');
         if (key && value) {
           process.env[key.trim()] = value.trim();
         }
       });
     }
  }

  const supabase = createAdminClient();
  const tables = [
    'conversations',
    'messages',
    'agent_runs',
    'agent_tasks',
    'voice_sessions',
    'jarvis_projects',
    'jarvis_goals',
    'jarvis_reflections',
    'message_embeddings'
  ];

  console.log('--- FORENSIC TABLE COUNTS ---');
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`${table.padEnd(20)}: ERROR - ${error.message}`);
    } else {
      console.log(`${table.padEnd(20)}: ${count} rows`);
    }
  }

  console.log('\n--- RECENT ACTIVITY (Last 5 Messages) ---');
  const { data: recentMessages, error: msgError } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (msgError) {
    console.log(`Error fetching messages: ${msgError.message}`);
  } else {
    recentMessages?.forEach((msg: any) => {
      console.log(`[${msg.created_at}] ${msg.role}: ${msg.content.slice(0, 50)}...`);
    });
  }

  console.log('\n--- AGENT RUNS DETAIL ---');
  const { data: runDetails, error: rdError } = await supabase
    .from('agent_runs')
    .select('id, user_id, goal, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (rdError) {
    console.log(`Error: ${rdError.message}`);
  } else {
    runDetails?.forEach((run: any) => {
      console.log(`Run ${run.id}: User ${run.user_id} | Status: ${run.status} | Goal: ${run.goal.slice(0, 30)}...`);
    });
  }

  console.log('\n--- CONVERSATIONS DETAIL ---');
  const { data: convDetails, error: cdError } = await supabase
    .from('conversations')
    .select('id, user_id, title, created_at')
    .limit(5);

  if (cdError) {
    console.log(`Error: ${cdError.message}`);
  } else {
    convDetails?.forEach((c: any) => {
      console.log(`Conv ${c.id}: User ${c.user_id} | Title: ${c.title}`);
    });
  }
}

forensicAudit();
