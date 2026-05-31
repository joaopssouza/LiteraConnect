import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import clientPromise from '@/lib/mongodb';
import { connectRedis } from '@/lib/redis';

/**
 * GET /api/recommendations
 *
 * Retorna posts recomendados para o usuário autenticado usando um algoritmo
 * de scoring composto que combina:
 *
 *   Score = (0.40 × follows_similarity)   — posts de autores que segue
 *         + (0.30 × tag_overlap)          — posts com tags/categorias de interesse
 *         + (0.20 × engagement_rate)      — taxa de engajamento do post
 *         + (0.10 × recency_score)        — recência do post (decai em 30 dias)
 *
 * Dados: activity_logs e post_analytics (MongoDB) + lista de seguidos (Supabase)
 * Cache: Redis TTL 5 minutos por usuário
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '10'), 20);

  const cacheKey = `recommendations:user:${user.id}`;

  try {
    // ── Cache Redis ────────────────────────────────────────────────────────
    const redis = await connectRedis();
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json({ posts: JSON.parse(cached as string), cached: true });
    }

    // ── 1. Buscar quem o usuário segue (Supabase) ──────────────────────────
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .limit(100);

    const followedIds = (follows || []).map((f: any) => f.following_id as string);

    // ── 2. Buscar tags de interesse do usuário (MongoDB activity_logs) ─────
    const mongoClient = await clientPromise;
    const db = mongoClient.db('literaconnect');

    // Tags/livros que o usuário interagiu nos últimos 90 dias
    const userInterestTags = await db
      .collection('activity_logs')
      .aggregate([
        {
          $match: {
            user_id: user.id,
            tags: { $exists: true, $ne: [] },
            created_at: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
        },
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ])
      .toArray();

    const interestTagSet = new Set(userInterestTags.map((t) => t._id as string));

    // ── 3. Buscar analytics de posts (MongoDB) ─────────────────────────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const postAnalytics = await db
      .collection('post_analytics')
      .find({
        created_at: { $gte: thirtyDaysAgo },
        views: { $gt: 0 },
      })
      .sort({ engagement_rate: -1, views: -1 })
      .limit(200)
      .project({ post_id: 1, views: 1, likes: 1, engagement_rate: 1, tags: 1, user_id: 1, created_at: 1 })
      .toArray();

    // ── 4. Calcular score composto ─────────────────────────────────────────
    const now = Date.now();
    const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

    const scoredPosts = postAnalytics
      .filter((p) => p.user_id !== user.id) // Exclui posts próprios
      .map((p) => {
        // (a) Follows similarity: 1 se autor é seguido, 0 caso contrário
        const followsScore = followedIds.includes(p.user_id) ? 1 : 0;

        // (b) Tag overlap: proporção de tags em comum com interesses do usuário
        const postTags: string[] = p.tags || [];
        const matchingTags = postTags.filter((t) => interestTagSet.has(t)).length;
        const tagScore = postTags.length > 0 ? matchingTags / postTags.length : 0;

        // (c) Engagement rate (já normalizado entre 0-1 pelo job de analytics)
        const engagementScore = Math.min(p.engagement_rate || 0, 1);

        // (d) Recency score: decai linearmente até 0 aos 30 dias
        const ageMs = now - new Date(p.created_at).getTime();
        const recencyScore = Math.max(0, 1 - ageMs / MAX_AGE_MS);

        // Score ponderado
        const score =
          0.4 * followsScore +
          0.3 * tagScore +
          0.2 * engagementScore +
          0.1 * recencyScore;

        return { post_id: p.post_id, score, followsScore, tagScore };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit * 2); // Busca o dobro para filtrar no Supabase

    if (scoredPosts.length === 0) {
      return NextResponse.json({ posts: [], cached: false });
    }

    // ── 5. Buscar detalhes dos posts no Supabase ───────────────────────────
    const postIds = scoredPosts.map((p) => p.post_id);

    const { data: posts, error } = await supabase
      .from('posts')
      .select(
        `id, content, book_title, book_cover_url, created_at, user_id, media,
         author:users (id, name, handle, avatar_url),
         likes_count:post_likes(count),
         comments_count:comments(count)`
      )
      .in('id', postIds)
      .is('deleted_at', null)
      .neq('status', 'draft')
      .limit(limit);

    if (error) throw error;

    // Re-ordena pelo score calculado (Supabase não mantém ordem do IN)
    const postScoreMap = new Map(scoredPosts.map((p) => [p.post_id, p.score]));
    const rankedPosts = (posts || [])
      .map((p: any) => ({
        ...p,
        likes_count: p.likes_count?.[0]?.count ?? 0,
        comments_count: p.comments_count?.[0]?.count ?? 0,
        _recommendation_score: postScoreMap.get(p.id) ?? 0,
      }))
      .sort((a, b) => b._recommendation_score - a._recommendation_score);

    // ── 6. Cache Redis por 5 minutos ──────────────────────────────────────
    await redis.setEx(cacheKey, 300, JSON.stringify(rankedPosts));

    return NextResponse.json({ posts: rankedPosts, cached: false });
  } catch (err: any) {
    console.error('[Recommendations] Erro:', err);
    return NextResponse.json(
      { error: 'Erro ao buscar recomendações.' },
      { status: 500 }
    );
  }
}
