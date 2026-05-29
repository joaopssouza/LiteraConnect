import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { getPostViews } from '@/lib/redis';
import clientPromise from '@/lib/mongodb';

// GET /api/analytics/posts — Dashboard do autor
// Retorna: total de views, likes, comments por post + série temporal de activity_logs
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;

  try {
    // 1. Busca metadados dos posts do autor no Supabase
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(
        `id, book_title, content, created_at, status, visibility, views_count,
         likes(count),
         comments(count:deleted_at.is.null)`
      )
      .eq('user_id', user.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50);

    if (postsError) throw postsError;

    // 2. Enriquece com views em tempo real do Redis (INCR, TTL 7 dias)
    const enriched = await Promise.all(
      (posts || []).map(async (post: any) => {
        const redisViews = await getPostViews(post.id).catch(() => 0);
        // Redis tem precedência; fallback para o campo views_count do Supabase
        const totalViews = redisViews > 0 ? redisViews : (post.views_count || 0);

        return {
          id: post.id,
          book_title: post.book_title,
          content: post.content?.slice(0, 120) || '',
          created_at: post.created_at,
          status: post.status,
          visibility: post.visibility,
          views: totalViews,
          likes: post.likes?.[0]?.count ?? 0,
          comments: post.comments?.[0]?.count ?? 0,
          engagement_rate:
            totalViews > 0
              ? (((post.likes?.[0]?.count ?? 0) + (post.comments?.[0]?.count ?? 0)) / totalViews) * 100
              : 0,
        };
      })
    );

    // 3. Agrega totais
    const totals = enriched.reduce(
      (acc, p) => ({
        views: acc.views + p.views,
        likes: acc.likes + p.likes,
        comments: acc.comments + p.comments,
        posts: acc.posts + 1,
      }),
      { views: 0, likes: 0, comments: 0, posts: 0 }
    );

    // 4. Busca série temporal de eventos no MongoDB (últimos 30 dias)
    let timeSeries: any[] = [];
    try {
      const mongo = await clientPromise;
      const db = mongo.db('literaconnect');
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Agrupa eventos por dia
      timeSeries = await db
        .collection('activity_logs')
        .aggregate([
          { $match: { user_id: user.id, logged_at: { $gte: since } } },
          { $unwind: '$events' },
          {
            $group: {
              _id: {
                day: { $dateToString: { format: '%Y-%m-%d', date: '$logged_at' } },
                type: '$events.type',
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.day': 1 } },
          { $project: { _id: 0, day: '$_id.day', type: '$_id.type', count: 1 } },
        ])
        .toArray();
    } catch {
      // MongoDB indisponível — retorna série vazia, não quebra o dashboard
    }

    return NextResponse.json({
      totals,
      posts: enriched,
      timeSeries,
    });
  } catch (err: any) {
    console.error('Analytics GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
