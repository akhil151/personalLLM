import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * createClient() initializes a Supabase client for Server Components,
 * Server Actions, and Route Handlers.
 * 
 * Why this exists:
 * Unlike the browser, the server doesn't automatically send or receive cookies.
 * We must manually pass the cookie store to the Supabase client so it can
 * read the user's session and update it (e.g., refreshing a token).
 */
export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
};
