import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('users')
      .update({ last_seen_at: nowIso })
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json({ ok: true, last_seen_at: nowIso });
  } catch (err: any) {
    console.error('Chat presence error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
