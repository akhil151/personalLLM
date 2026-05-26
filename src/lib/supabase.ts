import { createBrowserClient } from '@supabase/ssr';

/**
 * createClient() initializes a new Supabase client for the browser.
 * In Next.js App Router, we need different clients for client-side and server-side
 * to correctly handle cookies and session persistence.
 * 
 * Internal Workflow:
 * 1. createBrowserClient uses the browser's cookies to manage the session.
 * 2. It automatically handles refreshing the JWT when it expires.
 * 3. It's safe to use in Client Components ('use client').
 */
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// For simple client-side usage, we can export a singleton instance
export const supabase = createClient();
