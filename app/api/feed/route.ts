import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { buildServerCacheKey, getOrSetServerCache } from '@/lib/server-cache';
import { connectRedis } from '@/lib/redis';

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

      // Pega listagem de bloqueados para omitir do feed
      const { data: blocks } = await supabase.from('user_blocks').select('blocked_id').eq('blocker_id', userId);
      const blockedIds = blocks?.map((b: any) => b.blocked_id) || [];

      let query = supabase
        .from('posts')
        .select(
          `*,
          author:users!posts_user_id_fkey (
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

      if (blockedIds.length > 0) {
        query = query.not('user_id', 'in', `(${blockedIds.join(',')})`);
      }

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data, error } = await query;
      console.timeEnd('feed-db-query');
      if (error) throw error;

      console.time('feed-mapping');
      const hasMore = (data?.length || 0) > limit;
      const rawItems = (data ? data.slice(0, limit) : []).map((post: any) => ({
        ...post,
        likes_count: post.likes?.[0]?.count ?? 0,
        comments_count: post.comments?.[0]?.count ?? 0,
      }));

      // Enriquece views com contadores em tempo real do Redis
      let items = rawItems;
      try {
        const redis = await connectRedis();
        if (redis.isOpen) {
          const pipe = redis.multi();
          rawItems.forEach((post: any) => pipe.get(`post:${post.id}:views`));
          const redisValues = await pipe.exec();

          items = rawItems.map((post: any, i: number) => {
            const redisCount = redisValues[i] ? Number(redisValues[i]) : 0;
            // Usa o maior entre Redis (tempo real) e Supabase (consolidado)
            const views = Math.max(post.views_count ?? 0, redisCount);
            return { ...post, views };
          });
        }
      } catch {
        // Redis indisponível — usa views do banco normalmente
        items = rawItems.map((post: any) => ({ ...post, views: post.views_count ?? 0 }));
      }

      // Busca comentários recentes para posts apenas de texto (sem mídia/livro)
      const commentsToFetchLikes: string[] = [];
      await Promise.all(items.map(async (post: any) => {
        if ((!post.media || post.media.length === 0) && !post.book_cover_url) {
          const { data: comments } = await supabase
            .from('comments')
            .select('id, content, created_at, author:users!comments_user_id_fkey(name, handle, avatar_url), likes:comment_likes(count)')
            .eq('post_id', post.id)
            .is('parent_id', null)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(3);
          
          if (comments) {
            for (const c of comments) {
              const { count: repliesCount } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('parent_id', c.id).is('deleted_at', null);
              (c as any).likes_count = c.likes?.[0]?.count ?? 0;
              (c as any).replies_count = repliesCount ?? 0;
              (c as any).liked_by_me = false;
              commentsToFetchLikes.push(c.id);
            }
          }
          post.recent_comments = comments || [];
        }
      }));

      if (commentsToFetchLikes.length > 0) {
        const { data: myLikes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', userId)
          .in('comment_id', commentsToFetchLikes);
        
        const likedCommentIds = new Set(myLikes?.map(l => l.comment_id) || []);
        for (const post of items) {
          if (post.recent_comments) {
            for (const c of post.recent_comments) {
              c.liked_by_me = likedCommentIds.has(c.id);
            }
          }
        }
      }

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

