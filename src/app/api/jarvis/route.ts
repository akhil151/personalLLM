import { NextResponse } from 'next/server';
import { jarvisService } from '@/services/jarvisService';

export async function GET() {
  try {
    const state = await jarvisService.getState();
    return NextResponse.json(state);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { command, updates } = await req.json();

    if (updates) {
      await jarvisService.updateState(updates);
      return NextResponse.json({ success: true });
    }

    if (command) {
      const result = await jarvisService.routeCommand(command);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Missing command or updates' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
