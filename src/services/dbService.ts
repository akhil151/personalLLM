import { createClient } from '@/lib/supabase-server';

/**
 * dbService handles all direct PostgreSQL interactions for conversations and messages.
 * Using a centralized service ensures consistent RLS application and error handling.
 */
export const dbService = {
  /**
   * Fetches all conversations for the current user.
   */
  async getConversations() {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Creates a new conversation.
   */
  async createConversation(title: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Unauthorized');

    const { data, error } = await supabase
      .from('conversations')
      .insert([{ title, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetches all messages for a specific conversation.
   */
  async getMessages(conversationId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * Saves a message (User or Assistant) to the database.
   */
  async saveMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('messages')
      .insert([{ 
        conversation_id: conversationId, 
        role, 
        content 
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
