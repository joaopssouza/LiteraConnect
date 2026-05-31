import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth, isAuthError } from '@/lib/auth-utils';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { user } = auth;
    
    const paramsObj = await params;
    const blockedId = paramsObj.id;

    if (!blockedId || blockedId === 'undefined') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId);

    if (error) {
      console.error('Error unblocking user:', error);
      return NextResponse.json({ error: 'Erro ao desbloquear usuário' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Privacy Block DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    );
  }
}
