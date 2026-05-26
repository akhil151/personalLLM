import { createClient } from '@supabase/supabase-js';

// These environment variables are required to connect to your Supabase project.
// We use '!' to tell TypeScript that we are sure these variables exist.
// In a real production app, you'd want to validate these at runtime.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * createClient() initializes a new Supabase client.
 * This client is the entry point to all Supabase functionality:
 * - Auth (authentication and session management)
 * - Database (PostgreSQL interactions)
 * - Storage (file uploads)
 * - Realtime (subscriptions)
 * 
 * Internal Workflow:
 * 1. It takes the project URL and the Anonymous Key.
 * 2. It sets up an internal fetch-based transport for API requests.
 * 3. It automatically handles authentication headers if a user is logged in.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
