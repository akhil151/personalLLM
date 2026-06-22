import { NextResponse } from 'next/server';
import { eventBus, EventType } from '@/events/eventBus';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const supabase = createAdminClient();
    const { 
      eventType, 
      payload, 
      conversationId, 
      userId, 
      workflowId 
    } = await req.json();

    // Validate required fields
    if (!eventType || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType and userId' },
        { status: 400 }
      );
    }

    // Use workflowId as runId, or conversationId if workflowId not available
    const runId = workflowId || conversationId || 'voice';

    // Emit the event
    await eventBus.publish(runId, eventType as EventType, {
      ...payload,
      timestamp: new Date().toISOString(),
      conversation_id: conversationId,
      workflow_id: workflowId,
      user_id: userId,
      source: 'voice',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[VOICE_EVENTS_API] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
