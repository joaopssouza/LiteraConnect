import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { buildServerCacheKey, getOrSetServerCache } from '@/lib/server-cache';

const DEFAULT_PAGE_SIZE = 10;

export async function GET(request: Request) {
  console.time('feed-api-total');
  // 1. Valida JWT — userId vem do token, nunca do query string
  const auth = await requireAuth(request);
  if (isAuthError(auth)) {
    console.timeEnd('feed-api-total');
    return auth;
  }

  const { user, supabase } = auth;
  const userId = user.id;

  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor');
  const limitParam = url.searchParams.get('limit');
  const limit = Math.min(Number(limitParam) || DEFAULT_PAGE_SIZE, 50);

  try {
    const cacheKey = buildServerCacheKey('feed', userId, cursor || 'first', limit);
    const ttlMs = cursor ? 7000 : 15000;

    console.time('feed-get-cache');
    const { value, hit } = await getOrSetServerCache(cacheKey, ttlMs, async () => {
      console.time('feed-db-query');
      const now = new Date().toISOString();

      let query = supabase
        .from('posts')
        .select(
          `*,
          author:users (
            name,
            handle,
            avatar_url
          ),
          likes(count),
          comments(count)
          `
        )
        .order('created_at', { ascending: false })
        .limit(limit + 1)
        .eq('status', 'published')
        .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
        // Usuário autenticado pode ver seus próprios posts não listados
        .or(`visibility.eq.public,and(visibility.eq.unlisted,user_id.eq.${userId})`);

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data, error } = await query;
      console.timeEnd('feed-db-query');
      if (error) throw error;

      console.time('feed-mapping');
      const hasMore = (data?.length || 0) > limit;
      const items = (data ? data.slice(0, limit) : []).map((post: any) => ({
        ...post,
        likes_count: post.likes?.[0]?.count ?? 0,
        comments_count: post.comments?.[0]?.count ?? 0,
      }));
      const nextCursor = hasMore ? items[items.length - 1]?.created_at : null;
      console.timeEnd('feed-mapping');

      return { items, nextCursor };
    });
    console.timeEnd('feed-get-cache');

    const response = NextResponse.json(value);
    response.headers.set('Cache-Control', 'private, max-age=0, s-maxage=15, stale-while-revalidate=30');
    response.headers.set('X-Server-Cache', hit ? 'HIT' : 'MISS');
    console.timeEnd('feed-api-total');
    return response;
  } catch (err: any) {
    console.error('Feed API error:', err);
    console.timeEnd('feed-api-total');
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
