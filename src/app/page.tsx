import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If user is already logged in, send them to the dashboard
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 dark:bg-zinc-950">
      <div className="w-full max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            AI Assistant Platform
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
            The foundation for your next-generation AI agents. 
            Secure, scalable, and production-ready.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-lg shadow-zinc-200 dark:shadow-none"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 bg-white text-zinc-900 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-all dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800"
          >
            Log In
          </Link>
        </div>

        <div className="pt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <FeatureCard 
            title="Secure Auth" 
            description="Built-in Supabase Auth with JWT and HTTP-only cookies."
          />
          <FeatureCard 
            title="RLS Protection" 
            description="Row Level Security ensures users only see their own data."
          />
          <FeatureCard 
            title="Next.js 15" 
            description="Leveraging the latest App Router features and Server Components."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
      <h3 className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
