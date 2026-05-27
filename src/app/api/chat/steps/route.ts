import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    if (!conversationId) return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });

    const supabase = await createClient();

    // 1. Get the latest run for this conversation
    const { data: run } = await supabase
      .from('agent_runs')
      .select('id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!run) return NextResponse.json({ steps: [] });

    // 2. Get steps for this run
    const { data: steps } = await supabase
      .from('execution_steps')
      .select('*')
      .eq('run_id', run.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({ steps: steps || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
