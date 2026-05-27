import { supabase } from '@/lib/supabase';

/**
 * messageService handles all database interactions related to messages.
 * 
 * SECURITY NOTE:
 * Even though we pass the user_id here, Supabase Row Level Security (RLS)
 * will validate that the authenticated user's ID matches the user_id being 
 * inserted. If they don't match, the database will reject the request.
 */
export const messageService = {
  /**
   * Fetches all messages for the currently authenticated user.
   */
  async getUserMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Saves a new message to the Supabase database.
   * @param content The text content of the message.
   */
  async saveMessage(content: string) {
    // 1. Get the current user session
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('You must be logged in to save messages.');
    }

    // 2. Get or create a default conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!conversation) {
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert([{ user_id: user.id, title: 'Default Conversation' }])
        .select()
        .single();
      
      if (convError) throw convError;
      conversation = newConversation;
    }

    // 3. Perform the insert
    const { data, error } = await supabase
      .from('messages')
      .insert([
        { 
          content, 
          conversation_id: conversation.id,
          role: 'user'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('RLS or Database Error:', error.message);
      throw error;
    }

    return data;
  }
};
