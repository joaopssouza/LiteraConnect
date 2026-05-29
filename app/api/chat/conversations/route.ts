import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { buildServerCacheKey, getOrSetServerCache, invalidateServerCacheByPrefix } from '@/lib/server-cache';

const UNREAD_RPC_RETRY_MS = 5 * 60 * 1000;
let unreadRpcDisabledUntil = 0;
const isUnreadRpcMissing = (msg?: string) =>
  /could not find the function\s+public\.get_chat_unread_counts|schema cache/i.test(msg || '');
const canTryUnreadRpc = () => Date.now() >= unreadRpcDisabledUntil;

export async function GET(request: Request) {
  console.time('chat-conversations-total');
  const auth = await requireAuth(request);
  if (isAuthError(auth)) {
    console.timeEnd('chat-conversations-total');
    return auth;
  }

  const { user, supabase } = auth;
  const userId = user.id;

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50);

  try {
    const cacheKey = buildServerCacheKey('chat', 'conversations', userId, limit);
    const { value, hit } = await getOrSetServerCache(cacheKey, 5000, async () => {
      // RPC SECURITY DEFINER: retorna conversas com 'other' garantido (sem ambiguidade do PostgREST)
      console.time('chat-rpc-conversations');
      const { data: convoRows, error: rpcError } = await supabase.rpc('get_user_conversations', {
        p_user_id: userId,
        p_limit: limit,
      });
      if (rpcError) throw rpcError;
      console.timeEnd('chat-rpc-conversations');

      const convos: any[] = convoRows || [];
      const conversationIds = convos.map((c: any) => c.id);

      // Última mensagem de cada conversa (single query, sem N+1)
      console.time('chat-latest-messages');
      const { data: latestMessagesData } = await supabase
        .from('messages')
        .select('id, content, attachment_url, user_id, created_at, conversation_id')
        .in('conversation_id', conversationIds.length > 0 ? conversationIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: false });

      const lastMsgMap = new Map<string, any>();
      latestMessagesData?.forEach(msg => {
        if (!lastMsgMap.has(msg.conversation_id)) lastMsgMap.set(msg.conversation_id, msg);
      });
      console.timeEnd('chat-latest-messages');

      // Contagem de não lidos via RPC
      const unreadMap = new Map<string, number>();
      if (conversationIds.length > 0 && canTryUnreadRpc()) {
        console.time('chat-unread-rpc');
        const { data: unreadRows, error: unreadErr } = await supabase.rpc('get_chat_unread_counts', {
          p_user_id: userId,
          p_conversation_ids: conversationIds,
        });
        if (!unreadErr && Array.isArray(unreadRows)) {
          unreadRows.forEach((r: any) => {
            if (r?.conversation_id) unreadMap.set(r.conversation_id, Number(r.unread_count) || 0);
          });
        } else if (unreadErr && isUnreadRpcMissing(unreadErr.message)) {
          unreadRpcDisabledUntil = Date.now() + UNREAD_RPC_RETRY_MS;
        }
        console.timeEnd('chat-unread-rpc');
      }

      const conversations = convos.map((convo: any) => {
        const lastMessage = lastMsgMap.get(convo.id) || null;
        const myLastReadAt = convo.my_last_read_at || null;

        const unreadCount = unreadMap.has(convo.id)
          ? unreadMap.get(convo.id) || 0
          : lastMessage && lastMessage.user_id !== userId &&
            (!myLastReadAt || new Date(lastMessage.created_at).getTime() > new Date(myLastReadAt).getTime())
          ? 1
          : 0;

        return {
          id: convo.id,
          is_group: convo.is_group,
          created_at: convo.created_at,
          participants: convo.participants || [],
          other: convo.other || null,             // garantido pela RPC
          last_message: lastMessage,
          unread_count: unreadCount,
          my_last_read_at: myLastReadAt,
          other_last_read_at: convo.other_last_read_at || null,
          other_last_seen_at: convo.other?.last_seen_at || null,
        };
      });

      return { conversations };
    });

    const response = NextResponse.json(value);
    response.headers.set('Cache-Control', 'private, max-age=0, s-maxage=5, stale-while-revalidate=10');
    response.headers.set('X-Server-Cache', hit ? 'HIT' : 'MISS');
    console.timeEnd('chat-conversations-total');
    return response;
  } catch (err: any) {
    console.error('Chat conversations error:', err);
    console.timeEnd('chat-conversations-total');
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}


// PATCH — marca conversa como lida via RPC SECURITY DEFINER
// (auth.uid() = NULL no server-side Next.js; UPDATE direto falharia silenciosamente)
export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;

  try {
    const { conversationId } = await request.json();
    if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });

    // RPC SECURITY DEFINER: valida participação e atualiza last_read_at
    const { data: lastReadAt, error: rpcError } = await supabase.rpc('mark_conversation_read', {
      p_user_id: user.id,
      p_conversation_id: conversationId,
    });

    if (rpcError) throw rpcError;

    invalidateServerCacheByPrefix(buildServerCacheKey('chat', 'conversations', user.id));
    return NextResponse.json({ ok: true, last_read_at: lastReadAt });
  } catch (err: any) {
    console.error('[PATCH /api/chat/conversations]', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

// POST — inicia uma nova conversa 1:1 via RPC SECURITY DEFINER
// (auth.uid() retorna NULL no contexto server-side Next.js; usar inserção direta falha com 42501)
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;

  try {
    const { targetUserId } = await request.json();
    if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 });
    if (targetUserId === user.id) return NextResponse.json({ error: 'Cannot chat with yourself' }, { status: 400 });

    // Chama RPC SECURITY DEFINER: cria conversa + participantes ou retorna a existente
    const { data: conversationId, error: rpcError } = await supabase.rpc(
      'create_direct_conversation',
      { p_creator_id: user.id, p_target_id: targetUserId }
    );

    if (rpcError) throw rpcError;

    invalidateServerCacheByPrefix(buildServerCacheKey('chat', 'conversations', user.id));
    invalidateServerCacheByPrefix(buildServerCacheKey('chat', 'conversations', targetUserId));

    return NextResponse.json({ conversationId }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/chat/conversations]', err);
    return NextResponse.json({ error: err.message, details: err }, { status: 500 });
  }
}
