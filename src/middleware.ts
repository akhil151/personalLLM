import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase-middleware';

/**
 * Next.js Middleware.
 * This runs before every request to the application.
 * We use it to protect routes and manage user sessions centrally.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  /**
   * Matcher defines which paths the middleware should run on.
   * We want it to run on all paths except static assets and internal Next.js paths.
   */
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
