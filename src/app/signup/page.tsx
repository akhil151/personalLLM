'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/authService';

/**
 * Signup Page component.
 * Internal Flow:
 * 1. User submits email/password.
 * 2. authService.signUp() is called.
 * 3. Supabase creates the user and sends a confirmation email (if configured).
 */
export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      await authService.signUp(email, password);
      setMessage({ 
        type: 'success', 
        text: 'Signup successful! Please check your email for a confirmation link.' 
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to sign up' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-bold mb-2 dark:text-zinc-50">Create Account</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">Join the AI Assistant platform</p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-zinc-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-zinc-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-zinc-900 text-white py-2 rounded-lg font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm border ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
              : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{' '}
          <Link href="/login" className="text-zinc-900 dark:text-zinc-50 font-medium hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
