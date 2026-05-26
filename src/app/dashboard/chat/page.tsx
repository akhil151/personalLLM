import { redirect } from 'next/navigation';
import { dbService } from '@/services/dbService';
import { createClient } from '@/lib/supabase-server';

/**
 * REDIRECT ROUTE
 * 
 * If the user hits /dashboard/chat without an ID, 
 * we either find their latest chat or create a new one.
 */
export default async function ChatIndexPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const conversations = await dbService.getConversations();

  if (conversations && conversations.length > 0) {
    redirect(`/dashboard/chat/${conversations[0].id}`);
  } else {
    const newChat = await dbService.createConversation('New Chat');
    redirect(`/dashboard/chat/${newChat.id}`);
  }
}
