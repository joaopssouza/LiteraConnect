import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import { buildServerCacheKey, getOrSetServerCache, invalidateServerCache } from '@/lib/server-cache';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user, supabase } = auth;
  const userId = user.id;

  try {
    const cacheKey = buildServerCacheKey('activity', userId);
    const { value, hit } = await getOrSetServerCache(cacheKey, 7000, async () => {
      const { data: myPosts, error: postsError } = await supabase
        .from('posts')
        .select('id, content, book_cover_url')
        .eq('user_id', userId);
      if (postsError) throw postsError;

      const myPostIds = (myPosts || []).map((p) => p.id);
      const activities: any[] = [];

      if (myPostIds.length > 0) {
        const { data: likes, error: likesError } = await supabase
          .from('likes')
          .select('id, created_at, post_id, user:users(name, handle, avatar_url)')
          .in('post_id', myPostIds)
          .neq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30);
        if (likesError) throw likesError;

        likes?.forEach((like: any) => {
          activities.push({
            id: `like-${like.id}`,
            type: 'like',
            created_at: like.created_at,
            user: like.user,
            post: {
              id: like.post_id,
              content: myPosts.find((p) => p.id === like.post_id)?.content || '',
              book_cover_url: myPosts.find((p) => p.id === like.post_id)?.book_cover_url || null,
            },
          });
        });

        const { data: comments, error: commentsError } = await supabase
          .from('comments')
          .select('id, created_at, post_id, content, deleted_at, user:users(name, handle, avatar_url)')
          .in('post_id', myPostIds)
          .neq('user_id', userId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(30);
        if (commentsError) throw commentsError;

        comments?.forEach((comment: any) => {
          activities.push({
            id: `comment-${comment.id}`,
            type: 'comment',
            created_at: comment.created_at,
            user: comment.user,
            comment_content: comment.content,
            post: {
              id: comment.post_id,
              content: myPosts.find((p) => p.id === comment.post_id)?.content || '',
              book_cover_url: myPosts.find((p) => p.id === comment.post_id)?.book_cover_url || null,
            },
          });
        });
      }

      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('follower_id, created_at, user:users!follower_id(name, handle, avatar_url)')
        .eq('following_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (followsError) throw followsError;

      follows?.forEach((follow: any) => {
        activities.push({
          id: `follow-${follow.follower_id}-${follow.created_at}`,
          type: 'follow',
          created_at: follow.created_at,
          user: follow.user,
        });
      });

      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const result = { activities: activities.slice(0, 50), myPostIds };

      // Persiste snapshot no MongoDB para analytics futuros (fire-and-forget)
      logActivityToMongo(userId, activities.slice(0, 5)).catch(() => {});

      return result;
    });

    const response = NextResponse.json(value);
    response.headers.set('Cache-Control', 'private, max-age=0, s-maxage=7, stale-while-revalidate=20');
    response.headers.set('X-Server-Cache', hit ? 'HIT' : 'MISS');
    return response;
  } catch (err: any) {
    console.error('Activity API error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

// PATCH — marca atividades como lidas (invalida cache para forçar rebuild)
export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { user } = auth;

  try {
    // Invalida o cache de activity para este usuário
    const cacheKey = buildServerCacheKey('activity', user.id);
    await invalidateServerCache(cacheKey);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Mark-as-read error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Fire-and-forget: persiste snapshot de atividade no MongoDB para analytics
async function logActivityToMongo(userId: string, events: any[]) {
  if (!events.length) return;
  try {
    const mongo = await clientPromise;
    const db = mongo.db('literaconnect');
    await db.collection('activity_logs').insertOne({
      user_id: userId,
      events: events.map((e) => ({
        type: e.type,
        actor: e.user?.handle,
        post_id: e.post?.id || null,
        at: new Date(e.created_at),
      })),
      logged_at: new Date(),
    });
  } catch {
    // Silencioso — MongoDB indisponível não quebra a API
  }
}
