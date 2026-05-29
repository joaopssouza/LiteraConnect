import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const followersOnly = url.searchParams.get('followersOnly') === 'true'; // Se o usuário quer apenas buscar seguidores

  try {
    let query = supabase
      .from('users')
      .select('id, name, handle, avatar_url')
      .neq('id', user.id)
      .limit(20);

    if (q) {
      const cleanQ = q.replace(/^@/, ''); // Remove o @ se o usuário digitar
      query = query.or(`handle.ilike.%${cleanQ}%,name.ilike.%${cleanQ}%`);
    }

    const { data: users, error } = await query;
    if (error) throw error;

    let finalUsers = users || [];

    // Filtra apenas quem segue o usuário atual
    if (followersOnly && finalUsers.length > 0) {
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id)
        .in('follower_id', finalUsers.map(u => u.id));

      if (!followsError) {
        const followerIds = new Set(follows?.map(f => f.follower_id) || []);
        finalUsers = finalUsers.filter(u => followerIds.has(u.id));
      }
    }

    return NextResponse.json({ users: finalUsers });
  } catch (err: any) {
    console.error('API chat users error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
