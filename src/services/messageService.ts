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

    // 2. Perform the insert
    // We explicitly include user_id to be transparent, though the DB default would also work.
    // RLS policy "Users can insert own messages" will verify: auth.uid() === user_id
    const { data, error } = await supabase
      .from('messages')
      .insert([
        { 
          content, 
          user_id: user.id 
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
