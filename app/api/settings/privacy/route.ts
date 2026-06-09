import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth, isAuthError } from '@/lib/auth-utils';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { user } = auth;

    // Fetch user privacy settings
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('is_private')
      .eq('id', user.id)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Error fetching user privacy settings:', userError);
      return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
    }

    // Fetch blocked users
    const { data: blockedData, error: blockedError } = await supabaseAdmin
      .from('user_blocks')
      .select('blocked_id, users:blocked_id(name, handle, avatar_url)')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });

    if (blockedError) {
      console.error('Error fetching blocked users:', blockedError);
      return NextResponse.json({ error: 'Erro ao buscar bloqueios' }, { status: 500 });
    }

    const blockedUsers = blockedData.map((item: any) => ({
      id: item.blocked_id,
      name: item.users?.name,
      handle: item.users?.handle,
      avatar_url: item.users?.avatar_url,
    }));

    // Fetch hidden posts count
    const { count: hiddenPostsCount, error: hiddenError } = await supabaseAdmin
      .from('hidden_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (hiddenError) {
      console.error('Error fetching hidden posts count:', hiddenError);
    }

    return NextResponse.json({
      is_private: userData?.is_private ?? false,
      blocked_users: blockedUsers,
      hiddenPostsCount: hiddenPostsCount || 0
    });
  } catch (error: any) {
    console.error('Privacy GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { user } = auth;
    const { is_private } = await request.json();

    if (typeof is_private !== 'boolean') {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({ is_private })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating privacy:', error);
      return NextResponse.json({ error: 'Erro ao atualizar privacidade' }, { status: 500 });
    }

    return NextResponse.json({ success: true, is_private });
  } catch (error: any) {
    console.error('Privacy PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    );
  }
}
