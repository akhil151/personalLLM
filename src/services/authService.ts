import { supabase } from '@/lib/supabase';
import { AuthError } from '@supabase/supabase-js';

/**
 * authService handles all authentication logic.
 * We separate this from the UI to make it reusable and maintainable.
 */
export const authService = {
  /**
   * Signs up a new user with email and password.
   * Internal Flow:
   * 1. Supabase Auth creates a new user in the 'auth' schema.
   * 2. A confirmation email is sent (by default).
   * 3. A session is created if email confirmation is disabled.
   */
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // You can specify where to redirect after email confirmation
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Logs in an existing user.
   * Internal Flow:
   * 1. Supabase verifies credentials.
   * 2. If valid, Supabase returns a JWT (access_token) and a Refresh Token.
   * 3. The SDK stores these in cookies for session persistence.
   */
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Logs out the current user.
   * Internal Flow:
   * 1. Supabase invalidates the session on the server.
   * 2. The SDK clears the local session cookies.
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Gets the current user session.
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  }
};
