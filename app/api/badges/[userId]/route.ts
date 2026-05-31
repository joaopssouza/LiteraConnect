import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import clientPromise from '@/lib/mongodb';
import { connectRedis } from '@/lib/redis';

// ────────────────────────────────────────────────────────────────────────────
// Definição de badges disponíveis na plataforma
// ────────────────────────────────────────────────────────────────────────────
const BADGE_DEFINITIONS = [
  {
    type: 'first_post',
    name: 'Primeira Resenha',
    description: 'Publicou seu primeiro post',
    icon: '📝',
    color: '#6366f1',
  },
  {
    type: 'avid_reader',
    name: 'Leitor Assíduo',
    description: 'Publicou 10 ou mais posts',
    icon: '📚',
    color: '#8b5cf6',
  },
  {
    type: 'critic',
    name: 'Crítico Literário',
    description: 'Fez 50 ou mais comentários',
    icon: '✍️',
    color: '#ec4899',
  },
  {
    type: 'social',
    name: 'Influenciador',
    description: 'Tem 100 ou mais seguidores',
    icon: '🌟',
    color: '#f59e0b',
  },
  {
    type: 'pioneer',
    name: 'Pioneiro',
    description: 'Um dos primeiros usuários da plataforma',
    icon: '🏆',
    color: '#10b981',
  },
  {
    type: 'liked',
    name: 'Autor Querido',
    description: 'Recebeu 100 curtidas nos posts',
    icon: '❤️',
    color: '#ef4444',
  },
  {
    type: 'connector',
    name: 'Conector',
    description: 'Segue 50 ou mais pessoas',
    icon: '🔗',
    color: '#3b82f6',
  },
] as const;

/**
 * GET /api/badges/[userId]
 * Retorna os badges desbloqueados de um usuário.
 * Cache Redis TTL 10 minutos.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const { userId } = await params;

  const cacheKey = `badges:user:${userId}`;

  try {
    // Cache Redis
    const redis = await connectRedis();
    const cached = await redis.get(cacheKey);
    if (cached) {
      return NextResponse.json({ badges: JSON.parse(cached as string), cached: true });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db('literaconnect');

    const badges = await db
      .collection('badges')
      .find({ user_id: userId })
      .sort({ unlocked_at: -1 })
      .project({ _id: 0, badge_type: 1, unlocked_at: 1 })
      .toArray();

    // Enriquecer com definições
    const enrichedBadges = badges.map((b) => {
      const def = BADGE_DEFINITIONS.find((d) => d.type === b.badge_type);
      return {
        ...b,
        name: def?.name ?? b.badge_type,
        description: def?.description ?? '',
        icon: def?.icon ?? '🏅',
        color: def?.color ?? '#6366f1',
      };
    });

    // Cache por 10 minutos
    await redis.setEx(cacheKey, 600, JSON.stringify(enrichedBadges));

    return NextResponse.json({ badges: enrichedBadges });
  } catch (err: any) {
    console.error('[Badges GET] Erro:', err);
    return NextResponse.json({ error: 'Erro ao buscar badges.' }, { status: 500 });
  }
}
