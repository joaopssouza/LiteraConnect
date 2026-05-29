import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { buildServerCacheKey, getOrSetServerCache } from '@/lib/server-cache';

const DEFAULT_LIMIT = 12;

// Sanitiza o termo de busca: escapa wildcards do SQL LIKE, limita tamanho
function sanitizeQuery(q: string): string {
  return q
    .trim()
    .slice(0, 100)
    .replace(/[%_\\]/g, '\\$&');
}

// Converte período em timestamp para filtro de data
function periodToDate(period: string | null): string | null {
  const days: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
  if (!period || !days[period]) return null;
  return new Date(Date.now() - days[period] * 24 * 60 * 60 * 1000).toISOString();
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { supabase } = auth;

  const url = new URL(request.url);
  const rawQ = url.searchParams.get('q') || '';
  const q = sanitizeQuery(rawQ);
  const period = url.searchParams.get('period');
  const sort = url.searchParams.get('sort') || 'recent';
  const limit = Math.min(Number(url.searchParams.get('limit')) || DEFAULT_LIMIT, 50);

  try {
    const cacheKey = buildServerCacheKey('search', q.toLowerCase(), period, sort, limit);
    const { value, hit } = await getOrSetServerCache(cacheKey, 20000, async () => {
      // --- Busca principal ---
      let searchQuery = supabase
        .from('posts')
        .select(
          `id, user_id, content, book_title, book_cover_url, created_at,
          author:users (name, handle, avatar_url),
          likes(count),
          comments(count)`
        )
        .eq('status', 'published')
        .eq('visibility', 'public')
        .limit(limit);

      // Filtro de período
      const since = periodToDate(period);
      if (since) searchQuery = searchQuery.gte('created_at', since);

      // Filtro de texto
      if (q) searchQuery = searchQuery.or(`content.ilike.%${q}%,book_title.ilike.%${q}%`);

      // Ordenação
      if (sort === 'popular') {
        searchQuery = searchQuery.order('count', { foreignTable: 'likes', ascending: false });
      } else {
        searchQuery = searchQuery.order('created_at', { ascending: false });
      }

      const { data: results, error } = await searchQuery;
      if (error) throw error;

      const normalizedResults = (results || []).map((post: any) => ({
        ...post,
        likes_count: post.likes?.[0]?.count ?? 0,
        comments_count: post.comments?.[0]?.count ?? 0,
      }));

      // --- Trending: top curtidos nos últimos 14 dias ---
      const { data: trendingData, error: trendingError } = await supabase
        .from('posts')
        .select(
          `id, user_id, content, book_title, book_cover_url, created_at,
          author:users (name, handle, avatar_url),
          likes(count)`
        )
        .eq('status', 'published')
        .eq('visibility', 'public')
        .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .order('count', { foreignTable: 'likes', ascending: false })
        .limit(10);

      if (trendingError) throw trendingError;

      const trending = (trendingData || []).map((post: any) => ({
        ...post,
        likes_count: post.likes?.[0]?.count ?? 0,
      }));

      return { results: normalizedResults, trending };
    });

    const response = NextResponse.json(value);
    response.headers.set('Cache-Control', 'private, max-age=0, s-maxage=20, stale-while-revalidate=30');
    response.headers.set('X-Server-Cache', hit ? 'HIT' : 'MISS');
    return response;
  } catch (err: any) {
    console.error('Search API error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
