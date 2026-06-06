import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/dashboard/LogoutButton';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { userIntelligenceService } from '@/services/userIntelligenceService';

/**
 * Dashboard Page (Server Component).
 * 
 * WHY THIS EXISTS:
 * This is the private area for authenticated users. 
 * We use Server-side session checking for maximum security.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  
  // 1. Fetch the user session on the server
  // This is the most secure way to protect a route.
  const { data: { user } } = await supabase.auth.getUser();

  // 2. If no user, redirect to login
  if (!user) {
    redirect('/login');
  }

  // 3. PHASE Z.3.5: Bootstrap user profile on first dashboard visit
  await userIntelligenceService.bootstrapProfile(user.id);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* HEADER SECTION */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              AI Platform Dashboard
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              Logged in as: <span className="font-medium text-zinc-900 dark:text-zinc-200">{user.email}</span>
            </p>
          </div>
          
          <LogoutButton />
        </header>

        {/* MAIN CONTENT AREA */}
        <main>
          <DashboardContent />
        </main>
      </div>
    </div>
  );
}
