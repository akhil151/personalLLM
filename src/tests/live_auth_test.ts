import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runAuthValidation() {
  console.log('--- PART 2: AUTH VALIDATION ---');
  
  const email = `test_user_${Math.floor(Math.random() * 10000)}@gmail.com`;
  const password = "Password123!";

  // 1. Signup
  console.log(`Attempting signup for ${email}...`);
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signupError) {
    console.error(`FAIL: Signup failed - ${signupError.message}`);
    return;
  }
  console.log(`PASS: Signup successful. User ID: ${signupData.user?.id}`);

  // 2. Login
  console.log(`Attempting login for ${email}...`);
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (loginError) {
    console.error(`FAIL: Login failed - ${loginError.message}`);
    return;
  }
  console.log(`PASS: Login successful. Session established.`);

  // 3. Session Persistence
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    console.log(`PASS: Session persisted in client.`);
  } else {
    console.error(`FAIL: Session not found after login.`);
    return;
  }

  // 4. Logout
  console.log('Attempting logout...');
  const { error: logoutError } = await supabase.auth.signOut();
  if (logoutError) {
    console.error(`FAIL: Logout failed - ${logoutError.message}`);
    return;
  }
  
  const { data: postLogoutSession } = await supabase.auth.getSession();
  if (!postLogoutSession.session) {
    console.log(`PASS: Logout successful. Session cleared.`);
  } else {
    console.error(`FAIL: Session still exists after logout.`);
    return;
  }

  console.log('\nOVERALL AUTH VALIDATION: PASS');
}

runAuthValidation().catch(console.error);
