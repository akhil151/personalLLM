import { jobQueue } from '@/queue/jobQueue';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * dbService handles all direct PostgreSQL interactions for conversations and messages.
 * Using a centralized service ensures consistent RLS application and error handling.
 */
export const dbService = {
  /**
   * Internal helper to get the correct Supabase client.
   */
  async _getSupabase() {
    if (typeof window === 'undefined') {
      try {
        const { createClient } = await import('@/lib/supabase-server');
        return await createClient();
      } catch (err) {
        return createAdminClient();
      }
    } else {
      const { createClient } = await import('@/lib/supabase');
      return createClient();
    }
  },

  /**
   * Fetches all conversations for the current user.
   */
  async getConversations() {
    const supabase = await this._getSupabase();
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
  async createConversation(title: string, userId?: string) {
    const supabase = await this._getSupabase();
    let finalUserId = userId;

    if (!finalUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');
      finalUserId = user.id;
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert([{ title, user_id: finalUserId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetches all messages for a specific conversation.
   */
  async getMessages(conversationId: string) {
    const supabase = await this._getSupabase();
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
   * Now triggers an asynchronous embedding job.
   */
  async saveMessage(conversationId: string, role: 'user' | 'assistant', content: string, userId?: string) {
    const supabase = await this._getSupabase();
    let finalUserId = userId;

    if (!finalUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');
      finalUserId = user.id;
    }

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

    // ASYNC: Enqueue embedding job
    await jobQueue.enqueue(finalUserId, 'embedding_generation', {
      messageId: data.id,
      conversationId,
      userId: finalUserId,
      content
    });

    return data;
  },

  /**
   * PHASE Z.4.1.2: CANONICAL FLOW
   * Unifies all entry points into a single persistence chain.
   * User Input -> conversation -> message -> embedding job -> agent_run -> tasks
   */
  async initiateAutonomousRun(userId: string, input: string, conversationId?: string) {
    const { executionPipeline } = await import('@/orchestrator/executionPipeline');
    
    // 1. Ensure Conversation
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      const conv = await this.createConversation(input.slice(0, 50), userId);
      activeConversationId = conv.id;
    }

    // 2. Create User Message (Triggers embedding job via saveMessage)
    await this.saveMessage(activeConversationId, 'user', input, userId);

    // 3. Trigger Execution Pipeline (Creates agent_run and tasks)
    const result = await executionPipeline.run(userId, activeConversationId, input);
    
    return result;
  }
};
