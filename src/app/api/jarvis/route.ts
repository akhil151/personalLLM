import { NextResponse } from 'next/server';
import { jarvisService } from '@/services/jarvisService';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    const state = await jarvisService.getState(userId);
    return NextResponse.json(state);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    const { command, updates } = await req.json();

    if (updates) {
      await jarvisService.updateState(updates);
      return NextResponse.json({ success: true });
    }

    if (command) {
      const result = await jarvisService.routeCommand(command, userId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Missing command or updates' }, { status: 400 });
  } catch (error: any) {
    console.error('Jarvis API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
