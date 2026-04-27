import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { orchestratorService } from '@/orchestrator/orchestratorService';

export async function POST(req: Request) {
  try {
    const { conversationId, status, config } = await req.json();
    
    const supabase = createAdminClient();
    
    // Get user_id from conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const session = await orchestratorService.logVoiceSession(
      conversation.user_id,
      conversationId,
      status || 'completed',
      config || { provider: 'browser-native' }
    );

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    console.error('[VOICE_LOG_API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
