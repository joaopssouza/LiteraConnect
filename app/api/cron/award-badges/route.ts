import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/cron/award-badges
 *
 * Job Cron que verifica conquistas e desbloqueia badges para usuários.
 * Deve ser chamado periodicamente (ex: a cada 6h no vercel.json).
 *
 * Critérios verificados:
 *   - first_post:  1+ posts publicados
 *   - avid_reader: 10+ posts publicados
 *   - critic:      50+ comentários
 *   - social:      100+ seguidores
 *   - pioneer:     conta criada antes de 2026-07-01 (data de lançamento)
 *   - liked:       100+ curtidas totais nos posts
 *   - connector:   50+ usuários seguidos
 */
export async function GET(request: Request) {
  // Autenticação do cron job via secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Clientes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const mongoClient = await clientPromise;
    const db = mongoClient.db('literaconnect');

    let totalAwarded = 0;

    // ── 1. Buscar todos os usuários ──────────────────────────────────────
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, created_at')
      .limit(500);

    if (!allUsers || allUsers.length === 0) {
      return NextResponse.json({ message: 'Nenhum usuário encontrado.' });
    }

    const PIONEER_CUTOFF = new Date('2026-07-01');

    for (const user of allUsers) {
      const userId = user.id;

      // Buscar badges já desbloqueados para este usuário
      const existingBadges = await db
        .collection('badges')
        .find({ user_id: userId })
        .project({ badge_type: 1 })
        .toArray();

      const unlockedTypes = new Set(existingBadges.map((b) => b.badge_type as string));
      const toAward: { user_id: string; badge_type: string; unlocked_at: Date }[] = [];

      // ── Verificar critérios ────────────────────────────────────────────

      // posts publicados
      const { count: postCount } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'published');

      if ((postCount ?? 0) >= 1 && !unlockedTypes.has('first_post')) {
        toAward.push({ user_id: userId, badge_type: 'first_post', unlocked_at: new Date() });
      }
      if ((postCount ?? 0) >= 10 && !unlockedTypes.has('avid_reader')) {
        toAward.push({ user_id: userId, badge_type: 'avid_reader', unlocked_at: new Date() });
      }

      // comentários
      if (!unlockedTypes.has('critic')) {
        const { count: commentCount } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .is('deleted_at', null);

        if ((commentCount ?? 0) >= 50) {
          toAward.push({ user_id: userId, badge_type: 'critic', unlocked_at: new Date() });
        }
      }

      // seguidores
      if (!unlockedTypes.has('social')) {
        const { count: followerCount } = await supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', userId);

        if ((followerCount ?? 0) >= 100) {
          toAward.push({ user_id: userId, badge_type: 'social', unlocked_at: new Date() });
        }
      }

      // pioneiro
      if (!unlockedTypes.has('pioneer') && new Date(user.created_at) < PIONEER_CUTOFF) {
        toAward.push({ user_id: userId, badge_type: 'pioneer', unlocked_at: new Date() });
      }

      // curtidas totais nos posts
      if (!unlockedTypes.has('liked')) {
        const { count: likeCount } = await supabase
          .from('post_likes')
          .select('id', { count: 'exact', head: true })
          .eq('post_user_id', userId); // necessita de campo desnormalizado ou join

        if ((likeCount ?? 0) >= 100) {
          toAward.push({ user_id: userId, badge_type: 'liked', unlocked_at: new Date() });
        }
      }

      // seguindo
      if (!unlockedTypes.has('connector')) {
        const { count: followingCount } = await supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', userId);

        if ((followingCount ?? 0) >= 50) {
          toAward.push({ user_id: userId, badge_type: 'connector', unlocked_at: new Date() });
        }
      }

      // ── Inserir badges ──────────────────────────────────────────────────
      if (toAward.length > 0) {
        await db.collection('badges').insertMany(toAward);
        totalAwarded += toAward.length;

        // Criar notificações (fire-and-forget)
        const notifications = toAward.map((b) => ({
          user_id: b.user_id,
          actor_id: b.user_id,
          type: 'badge',
          metadata: { badge_type: b.badge_type },
        }));
        void supabase.from('notifications').insert(notifications);
      }
    }

    return NextResponse.json({
      message: `Badges concedidos: ${totalAwarded}`,
      users_checked: allUsers.length,
    });
  } catch (err: any) {
    console.error('[Cron award-badges] Erro:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
