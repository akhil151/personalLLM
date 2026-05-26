import { createClient } from '@/lib/supabase-server';
import { dbService } from '@/services/dbService';
import { redirect, notFound } from 'next/navigation';
import { ChatInterface } from '@/components/dashboard/ChatInterface';
import { ChatSidebar } from '@/components/dashboard/ChatSidebar';
import { LogoutButton } from '@/components/dashboard/LogoutButton';

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

/**
 * DYNAMIC CHAT PAGE
 * 
 * WHY THIS IS A SERVER COMPONENT:
 * 1. Security: We verify the user and the conversation ownership on the server.
 * 2. Performance: We fetch the initial messages and sidebar data before sending 
 *    any HTML to the browser, avoiding "loading spinners" for the core content.
 */
export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch conversation and messages on the server
  // RLS ensures that if this ID doesn't belong to the user, it returns null/error.
  let initialMessages = [];
  try {
    initialMessages = await dbService.getMessages(id);
  } catch (error) {
    console.error(error);
    notFound(); // Protect against unauthorized access via RLS
  }

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950">
      {/* SIDEBAR */}
      <ChatSidebar currentConversationId={id} />

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col">
        <header className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold dark:text-zinc-50">AI Assistant</h2>
            <p className="text-xs text-zinc-400">GPT-4o Pipeline Active</p>
          </div>
          <LogoutButton />
        </header>

        <main className="flex-1 p-6 overflow-hidden">
          <ChatInterface 
            conversationId={id} 
            initialMessages={initialMessages} 
          />
        </main>
      </div>
    </div>
  );
}
