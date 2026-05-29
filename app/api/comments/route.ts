import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

// GET — lista comentários de um post (paginado por cursor)
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { supabase } = auth;
  const url = new URL(request.url);
  const postId = url.searchParams.get('postId');
  const cursor = url.searchParams.get('cursor');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50);

  if (!postId) return NextResponse.json({ error: 'postId é obrigatório.' }, { status: 400 });

  try {
    let query = supabase
      .from('comments')
      .select(
        `id, content, created_at, parent_id, user_id,
         author:users (id, name, handle, avatar_url),
         likes_count:comment_likes(count)`
      )
      .eq('post_id', postId)
      .is('deleted_at', null)
      .is('parent_id', null) // Apenas comentários raiz
      .order('created_at', { ascending: true })
      .limit(limit + 1);

    if (cursor) query = query.gt('created_at', cursor);

    const { data, error } = await query;
    if (error) throw error;

    const hasMore = (data?.length || 0) > limit;
    const items = (data || []).slice(0, limit).map((c: any) => ({
      ...c,
      likes_count: c.likes_count?.[0]?.count ?? 0,
    }));
    const nextCursor = hasMore ? items[items.length - 1]?.created_at : null;

    return NextResponse.json({ comments: items, nextCursor });
  } catch (err: any) {
    console.error('Comments GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

// POST — cria novo comentário ou resposta
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;

  // Rate limit: 30 comentários por minuto por usuário
  const rl = await checkRateLimit(`comments:${user.id}`, 30, 60);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await request.json();
    const { postId, content, parentId } = body;

    if (!postId) return NextResponse.json({ error: 'postId é obrigatório.' }, { status: 400 });
    if (!content?.trim()) return NextResponse.json({ error: 'Conteúdo é obrigatório.' }, { status: 400 });
    if (content.trim().length > 1000)
      return NextResponse.json({ error: 'Comentário excede 1000 caracteres.' }, { status: 400 });

    // Valida parent (se reply)
    if (parentId) {
      const { data: parent } = await supabase
        .from('comments')
        .select('id')
        .eq('id', parentId)
        .is('deleted_at', null)
        .single();
      if (!parent) return NextResponse.json({ error: 'Comentário pai não encontrado.' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('comments')
      .insert([{
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
        parent_id: parentId || null,
      }])
      .select(`id, content, created_at, parent_id, user_id,
               author:users (id, name, handle, avatar_url)`)
      .single();

    if (error) throw error;
    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (err: any) {
    console.error('Comments POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

// DELETE — soft-delete de comentário (apenas o autor pode deletar)
export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;

  try {
    const url = new URL(request.url);
    const commentId = url.searchParams.get('id');
    if (!commentId) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });

    const { data, error } = await supabase
      .from('comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('user_id', user.id) // Garante que só o autor deleta
      .is('deleted_at', null)
      .select('id')
      .single();

    if (error || !data) return NextResponse.json({ error: 'Comentário não encontrado ou sem permissão.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Comments DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

// PATCH — like/unlike em comentário
export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;

  try {
    const { commentId, action } = await request.json();
    if (!commentId || !['like', 'unlike'].includes(action))
      return NextResponse.json({ error: 'commentId e action (like|unlike) são obrigatórios.' }, { status: 400 });

    if (action === 'like') {
      const { error } = await supabase
        .from('comment_likes')
        .insert([{ comment_id: commentId, user_id: user.id }]);
      if (error && error.code !== '23505') throw error; // ignora duplicata
    } else {
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Comment like PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
