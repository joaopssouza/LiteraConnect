import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { invalidateServerCacheByPrefix } from '@/lib/server-cache';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: Request) {
  // Valida JWT — user_id vem do token, nunca do body
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;

  // Rate limit: 10 posts por minuto por usuário
  const rl = await checkRateLimit(`posts:${user.id}`, 10, 60);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await req.json();
    const { content, book_title, book_cover_url } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Conteúdo é obrigatório.' }, { status: 400 });
    }

    if (content.trim().length > 5000) {
      return NextResponse.json({ error: 'Conteúdo excede o limite de 5000 caracteres.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          user_id: user.id,
          content: content.trim(),
          book_title: book_title?.trim() || null,
          book_cover_url: book_cover_url || null,
          status: 'published',
          visibility: 'public',
        },
      ])
      .select('id')
      .single();

    if (error) throw error;

    // Invalida o cache do feed para que o novo post apareça imediatamente
    await invalidateServerCacheByPrefix(`feed:${user.id}`);

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar post:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
