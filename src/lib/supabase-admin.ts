import { createClient } from '@supabase/supabase-js';

/**
 * createAdminClient() initializes a Supabase client with the service role key.
 * This client bypasses RLS and should ONLY be used in secure, server-side
 * infrastructure contexts like workers, schedulers, and internal services.
 * 
 * WHY THIS EXISTS:
 * Background workers and schedulers do not run within an HTTP request context.
 * They cannot access cookies() or headers. This client provides the necessary
 * infrastructure-level access to the database.
 */
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for Admin Client');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
