import { supabase } from '@/lib/supabase';

/**
 * messageService handles all database interactions related to messages.
 * By abstracting this logic into a service, we:
 * 1. Keep our components clean and focused on UI.
 * 2. Make our code more testable.
 * 3. Centralize data fetching logic.
 */
export const messageService = {
  /**
   * Saves a new message to the Supabase database.
   * @param content The text content of the message.
   */
  async saveMessage(content: string) {
    // We use the Supabase SDK to perform an 'insert' operation.
    // Behind the scenes:
    // 1. The SDK constructs a POST request to the Supabase PostgREST API.
    // 2. It includes the Anon Key in the headers.
    // 3. PostgreSQL executes the insert and returns the result.
    const { data, error } = await supabase
      .from('messages')
      .insert([{ content }])
      .select();

    if (error) {
      // We throw the error so the UI can catch it and display a message.
      throw new Error(error.message);
    }

    return data;
  }
};
