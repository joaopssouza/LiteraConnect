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

    const { error } = await supabaseAdmin
      .from('hidden_posts')
      .insert([{ user_id: user.id, post_id: postId }]);

    if (error && error.code !== '23505') { // Ignore unique violation if already hidden
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error hiding post:', error);
    return NextResponse.json({ error: error.message || 'Erro ao ocultar post' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { user } = auth;
    const { id: postId } = await params;

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('hidden_posts')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error unhiding post:', error);
    return NextResponse.json({ error: error.message || 'Erro ao desocultar post' }, { status: 500 });
  }
}
