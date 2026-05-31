import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { buildServerCacheKey, getOrSetServerCache } from '@/lib/server-cache';
import { connectRedis } from '@/lib/redis';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;
  const userId = user.id;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const cursor = searchParams.get('cursor');

    const cacheKey = buildServerCacheKey('reels', userId, cursor || 'first', limit);
    const ttlMs = cursor ? 7000 : 15000;

    const { value, hit } = await getOrSetServerCache(cacheKey, ttlMs, async () => {
      let query = supabase
        .from('posts')
        .select(`
          *,
          user:users!posts_user_id_fkey(id, name, handle, avatar_url),
          likes(count),
          comments(count)
        `)
        .eq('post_type', 'reel')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      const { data: reels, error } = await query;
      if (error) throw error;

      const rawReels = reels?.map((reel: any) => ({
        ...reel,
        likes: reel.likes?.[0]?.count || 0,
        comments: reel.comments?.[0]?.count || 0,
      })) || [];

      // Enriquece views com contadores em tempo real do Redis
      let processedReels = rawReels;
      try {
        const redis = await connectRedis();
        if (redis.isOpen && rawReels.length > 0) {
          const pipe = redis.multi();
          rawReels.forEach((r: any) => pipe.get(`post:${r.id}:views`));
          const redisValues = await pipe.exec();
          processedReels = rawReels.map((r: any, i: number) => ({
            ...r,
            views: Math.max(r.views_count ?? 0, redisValues[i] ? Number(redisValues[i]) : 0),
          }));
        } else {
          processedReels = rawReels.map((r: any) => ({ ...r, views: r.views_count ?? 0 }));
        }
      } catch {
        processedReels = rawReels.map((r: any) => ({ ...r, views: r.views_count ?? 0 }));
      }

      const nextCursor = processedReels.length === limit ? processedReels[processedReels.length - 1].created_at : null;
      return { reels: processedReels, nextCursor };
    });

    const response = NextResponse.json(value);
    response.headers.set('Cache-Control', 'private, max-age=0, s-maxage=15, stale-while-revalidate=30');
    response.headers.set('X-Server-Cache', hit ? 'HIT' : 'MISS');
    return response;
  } catch (error: any) {
    console.error('Reels API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
