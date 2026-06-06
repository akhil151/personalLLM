import { NextResponse } from 'next/server';
import { jarvisReflectionService } from '@/services/jarvisReflectionService';

export async function GET() {
  try {
    const reflections = await jarvisReflectionService.getLatestReflections();
    return NextResponse.json(reflections);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
