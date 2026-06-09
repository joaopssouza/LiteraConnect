import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { buildServerCacheKey, invalidateServerCacheByPrefix } from '@/lib/server-cache';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { broadcastToChatChannel } from '@/lib/realtime-broadcast';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;

  const url = new URL(request.url);
  const conversationId = url.searchParams.get('conversationId');
  const cursor = url.searchParams.get('cursor');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100);

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
  }

  try {
    // Verifica participação — userId do JWT, não do query string
    const { data: membership, error: membershipError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (membershipError) throw membershipError;
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (cursor) query = query.lt('created_at', cursor);

    const { data, error } = await query;
    if (error) throw error;

    const { data: reads } = await supabase
      .from('conversation_participants')
      .select('user_id, last_read_at')
      .eq('conversation_id', conversationId);

    const myRead = (reads || []).find((r: any) => r.user_id === user.id)?.last_read_at || null;
    const otherRead = (reads || []).find((r: any) => r.user_id !== user.id)?.last_read_at || null;

    const hasMore = (data?.length || 0) > limit;
    const items = data ? data.slice(0, limit).reverse() : [];
    const nextCursor = hasMore ? data![limit - 1]?.created_at : null;

    return NextResponse.json({ messages: items, nextCursor, my_last_read_at: myRead, other_last_read_at: otherRead });
  } catch (err: any) {
    console.error('Chat messages GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;

  try {
    const body = await request.json();
    const { conversationId, content, attachmentUrl } = body;

    if (!conversationId || (!content?.trim() && !attachmentUrl)) {
      return NextResponse.json({ error: 'conversationId e content (ou anexo) são obrigatórios.' }, { status: 400 });
    }

    if (content.length > 4000) {
      return NextResponse.json({ error: 'Mensagem excede 4000 caracteres.' }, { status: 400 });
    }

    // Verifica participação — user_id do JWT
    const { data: membership } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        conversation_id: conversationId,
        user_id: user.id,
        content: content.trim(),
        attachment_url: attachmentUrl || null,
      }])
      .select()
      .single();

    if (error) throw error;

    // Atualiza last_read_at do remetente
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: data.created_at })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    // Invalida cache de todos os participantes
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId);

    (participants || []).forEach((p: any) => {
      if (p?.user_id) invalidateServerCacheByPrefix(buildServerCacheKey('chat', 'conversations', p.user_id));
    });

    // Envio manual em tempo real via canal (broadcast HTTP direto ao Realtime interno)
    await broadcastToChatChannel(conversationId, 'new_message', { message: data });

    return NextResponse.json({ message: data });
  } catch (err: any) {
    console.error('Chat messages POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

// PATCH — editar conteúdo, soft-delete, reação OU marcar como lido (action: 'mark_read')
export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;

  try {
    const body = await request.json();
    const { messageId, action, content, emoji, conversationId: bodyConversationId } = body;

    // Acao especial: marcar conversa como lida e emitir read_receipt em tempo real
    if (action === 'mark_read' && bodyConversationId) {
      const nowIso = new Date().toISOString();
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: nowIso })
        .eq('conversation_id', bodyConversationId)
        .eq('user_id', user.id);

      // Emite evento em tempo real para o outro participante atualizar os ticks azuis
      await broadcastToChatChannel(bodyConversationId, 'read_receipt', {
        user_id: user.id,
        conversation_id: bodyConversationId,
        read_at: nowIso
      });

      return NextResponse.json({ ok: true, read_at: nowIso });
    }

    if (!messageId || !action) {
      return NextResponse.json({ error: 'messageId e action são obrigatórios.' }, { status: 400 });
    }

    const { data: msg, error: fetchErr } = await supabase
      .from('messages')
      .select('id, user_id, conversation_id, reactions')
      .eq('id', messageId)
      .single();

    if (fetchErr || !msg) return NextResponse.json({ error: 'Mensagem não encontrada.' }, { status: 404 });

    if ((action === 'edit' || action === 'delete') && msg.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'react') {
      const { data: membership } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('conversation_id', msg.conversation_id)
        .eq('user_id', user.id)
        .single();
      if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let update: Record<string, any> = {};

    if (action === 'edit') {
      if (!content?.trim()) return NextResponse.json({ error: 'Conteúdo vazio.' }, { status: 400 });
      if (content.length > 4000) return NextResponse.json({ error: 'Mensagem muito longa.' }, { status: 400 });
      update = { content: content.trim(), edited_at: new Date().toISOString() };
    } else if (action === 'delete') {
      update = { deleted_at: new Date().toISOString(), content: '' };
    } else if (action === 'react') {
      if (!emoji) return NextResponse.json({ error: 'emoji required' }, { status: 400 });
      const reactions: Record<string, string[]> = msg.reactions || {};
      const users = reactions[emoji] || [];
      if (users.includes(user.id)) {
        reactions[emoji] = users.filter((id: string) => id !== user.id);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...users, user.id];
      }
      update = { reactions };
    } else {
      return NextResponse.json({ error: 'action inválida.' }, { status: 400 });
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('messages')
      .update(update)
      .eq('id', messageId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Emite evento em tempo real de edicao, exclusao ou reacao via broadcast HTTP direto
    await broadcastToChatChannel(msg.conversation_id, 'update_message', { message: updated });

    return NextResponse.json({ message: updated });
  } catch (err: any) {
    console.error('Chat messages PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

