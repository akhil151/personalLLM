import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { orchestratorService } from '@/orchestrator/orchestratorService';

export async function POST(req: Request) {
  try {
    const { conversationId, status, config } = await req.json();
    
    const supabase = createAdminClient();
    
    // UUID VALIDATION: Fix for "Voice UUID Bug"
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let finalConversationId = conversationId;
    let finalUserId: string | null = null;

    if (!uuidRegex.test(conversationId)) {
      console.warn(`[VOICE_LOG_API] Invalid UUID for conversationId: ${conversationId}`);
      // Fallback: try to get user's first conversation or return error if totally invalid
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      finalUserId = user.id;

      const { data: conv } = await supabase.from('conversations').select('id').eq('user_id', user.id).limit(1).single();
      if (conv) {
        finalConversationId = conv.id;
      } else {
        const { data: newConv } = await supabase.from('conversations').insert([{ user_id: user.id, title: 'Default Voice Conv' }]).select().single();
        finalConversationId = newConv.id;
      }
    } else {
      // Get user_id from conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('user_id')
        .eq('id', finalConversationId)
        .single();

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      finalUserId = conversation.user_id;
    }

    if (!finalUserId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const session = await orchestratorService.logVoiceSession(
      finalUserId,
      finalConversationId,
      status || 'completed',
      config || { provider: 'browser-native' }
    );

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    console.error('[VOICE_LOG_API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
