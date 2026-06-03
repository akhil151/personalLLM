import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://sfjmuciupsmvoqchvfwx.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmam11Y2l1cHNtdm9xY2h2Znd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjI3MTMsImV4cCI6MjA5NTMzODcxM30.4jetwiWK2tmweo-iwYqsVQviK7Zol6es8aVpwNQNBxE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function signup() {
  const email = `test${Math.floor(Math.random()*1000)}@example.com`;
  const password = "Password123!";
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    console.log(`Signup failed: ${error.message}`);
  } else {
    console.log(`Signup successful! User ID: ${data.user?.id}`);
  }
}

signup();
