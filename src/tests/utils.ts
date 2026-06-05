import { createAdminClient } from '../lib/supabase-admin';

export async function getTestUser() {
  if (process.env.USE_MOCK_SUPABASE === 'true') {
    return '00000000-0000-0000-0000-000000000000';
  }
  const supabase = createAdminClient();
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error || !users || users.length === 0) {
    // If no users, try to find a profile or just use a placeholder if we can't create one
    // In a real environment we'd expect at least one user for testing
    console.log('No users found in auth.users, checking agent_runs for existing user_id');
    const { data: runs } = await supabase.from('agent_runs').select('user_id').limit(1);
    if (runs && runs.length > 0) return runs[0].user_id;
    
    throw new Error('No test user found. Please create a user in the system first.');
  }
  
  return users[0].id;
}

export async function getTestConversation(userId: string) {
  const supabase = createAdminClient();
  const { data: convs, error } = await supabase.from('conversations').select('id').eq('user_id', userId).limit(1);
  
  if (error || !convs || convs.length === 0) {
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert([{ user_id: userId, title: 'Chaos Test Conversation' }])
      .select()
      .single();
      
    if (createError) throw createError;
    return newConv.id;
  }
  
  return convs[0].id;
}
