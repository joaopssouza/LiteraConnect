import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';

// POST — seguir um usuário
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;

  try {
    const { targetUserId } = await request.json();
    if (!targetUserId) return NextResponse.json({ error: 'targetUserId é obrigatório.' }, { status: 400 });
    if (targetUserId === user.id) return NextResponse.json({ error: 'Você não pode seguir a si mesmo.' }, { status: 400 });

    const { error } = await supabase
      .from('follows')
      .insert([{ follower_id: user.id, following_id: targetUserId }]);

    if (error) {
      // Ignora duplicata — já está seguindo
      if (error.code === '23505') return NextResponse.json({ following: true });
      throw error;
    }

    return NextResponse.json({ following: true }, { status: 201 });
  } catch (err: any) {
    console.error('Follow POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

// DELETE — deixar de seguir um usuário
export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;

  try {
    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('targetUserId');
    if (!targetUserId) return NextResponse.json({ error: 'targetUserId é obrigatório.' }, { status: 400 });

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId);

    if (error) throw error;
    return NextResponse.json({ following: false });
  } catch (err: any) {
    console.error('Follow DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
