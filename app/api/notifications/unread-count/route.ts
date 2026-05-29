import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;
  const userId = user.id;

  try {
    // 1. Chat Unread Count via RPC (otimizado)
    // Buscamos as conversas do usuário para pegar os IDs e passar para a RPC de contagem
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);
    
    const conversationIds = (participants || []).map(p => p.conversation_id);
    let chatCount = 0;

    if (conversationIds.length > 0) {
      const { data: unreadRows } = await supabase.rpc('get_chat_unread_counts', {
        p_user_id: userId,
        p_conversation_ids: conversationIds,
      });
      if (Array.isArray(unreadRows)) {
        chatCount = unreadRows.reduce((acc, row) => acc + (Number(row.unread_count) || 0), 0);
      }
    }

    // 2. Activity Unread Count
    // Por enquanto, seguimos a lógica atual de contar likes, comments e follows 
    // onde o usuário é o destinatário. Futuramente, isso pode ser filtrado por data de último acesso.
    const { data: myPosts } = await supabase.from('posts').select('id').eq('user_id', userId);
    const myPostIds = (myPosts || []).map(p => p.id);

    let activityCount = 0;

    if (myPostIds.length > 0) {
      const [{ count: likes }, { count: comments }] = await Promise.all([
        supabase.from('likes').select('*', { count: 'exact', head: true }).in('post_id', myPostIds).neq('user_id', userId),
        supabase.from('comments').select('*', { count: 'exact', head: true }).in('post_id', myPostIds).neq('user_id', userId).is('deleted_at', null)
      ]);
      activityCount += (likes || 0) + (comments || 0);
    }

    const { count: follows } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);
    activityCount += (follows || 0);

    return NextResponse.json({
      chat: chatCount,
      activity: activityCount,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Unified notifications error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
