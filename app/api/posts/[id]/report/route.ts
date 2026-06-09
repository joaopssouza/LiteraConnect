import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth, isAuthError } from '@/lib/auth-utils';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { user } = auth;
    const { id: postId } = await params;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    let reason = null;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch (e) {
      // Body may be empty
    }

    const { error } = await supabaseAdmin
      .from('reported_posts')
      .insert([{ reporter_id: user.id, post_id: postId, reason }]);

    if (error && error.code !== '23505') { // Ignore unique violation if already reported
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error reporting post:', error);
    return NextResponse.json({ error: error.message || 'Erro ao denunciar post' }, { status: 500 });
  }
}
