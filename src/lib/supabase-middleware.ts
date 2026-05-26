import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * updateSession() is called by the middleware for every request.
 * It ensures the user's session is active and refreshed if needed.
 * 
 * JWT Lifecycle in Next.js:
 * 1. User logs in -> Supabase issues an Access Token (JWT) and a Refresh Token.
 * 2. JWT is short-lived (e.g., 1 hour) for security.
 * 3. Refresh Token is long-lived and stored in an HTTP-only cookie.
 * 4. When the JWT expires, this middleware uses the Refresh Token to get a new JWT.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // This will refresh the session if it's expired
  const { data: { user } } = await supabase.auth.getUser();

  // ROUTE PROTECTION LOGIC
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const isSignupPage = request.nextUrl.pathname.startsWith('/signup');

  // If user is not logged in and tries to access dashboard, redirect to login
  if (isDashboard && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user is logged in and tries to access auth pages, redirect to dashboard
  if ((isLoginPage || isSignupPage) && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}
