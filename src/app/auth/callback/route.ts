import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * AUTH CALLBACK ROUTE
 * 
 * WHY THIS EXISTS:
 * When Supabase sends an email confirmation or performs a social login,
 * it redirects the user back to this URL with a 'code' parameter.
 * This route exchanges that code for a real user session (JWT).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in search params, use it as the redirect URL
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
