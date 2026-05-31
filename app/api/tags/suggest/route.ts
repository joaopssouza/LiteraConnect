import { NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-utils';
import clientPromise from '@/lib/mongodb';
import { connectRedis } from '@/lib/redis';

/**
 * GET /api/tags/suggest?q=<query>&category=book|author
 * Busca tags inteligentes de livros e autores na collection `book_tags` do MongoDB.
 * Usa cache Redis TTL 10min para resultados frequentes.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const category = url.searchParams.get('category') ?? 'all'; // 'book' | 'author' | 'all'
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '10'), 20);

  if (q.length < 2) {
    return NextResponse.json({ tags: [] });
  }

  // Sanitizar query (evitar regex injection)
  const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cacheKey = `tags:suggest:${category}:${safeQ.toLowerCase()}`;

  try {
    // Cache Redis
    const redisClient = await connectRedis();
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return NextResponse.json({ tags: JSON.parse(cached as string), cached: true });
    }

    const client = await clientPromise;
    const db = client.db('literaconnect');

    const filter: Record<string, unknown> = {
      tag: { $regex: safeQ, $options: 'i' },
    };
    if (category !== 'all') {
      filter.category = category;
    }

    const tags = await db
      .collection('book_tags')
      .find(filter)
      .sort({ count: -1 }) // Mais usadas primeiro
      .limit(limit)
      .project({ _id: 0, tag: 1, category: 1, count: 1 })
      .toArray();

    // Salva no Redis por 10 minutos
    await redisClient.setEx(cacheKey, 600, JSON.stringify(tags));

    return NextResponse.json({ tags });
  } catch (err: any) {
    console.error('[Tags Suggest] Erro:', err);
    return NextResponse.json({ error: 'Erro ao buscar sugestões.' }, { status: 500 });
  }
}

/**
 * POST /api/tags/suggest
 * Registra (incrementa) o uso de uma tag, criando-a se não existir.
 * Body: { tag: string, category: 'book' | 'author' }
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const { tag, category } = await request.json();

    if (!tag?.trim() || !['book', 'author'].includes(category)) {
      return NextResponse.json(
        { error: 'tag e category (book|author) são obrigatórios.' },
        { status: 400 }
      );
    }

    const normalizedTag = tag.trim().toLowerCase();

    const client = await clientPromise;
    const db = client.db('literaconnect');

    await db.collection('book_tags').updateOne(
      { tag: normalizedTag, category },
      {
        $inc: { count: 1 },
        $setOnInsert: { tag: normalizedTag, category, created_at: new Date() },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, tag: normalizedTag });
  } catch (err: any) {
    console.error('[Tags POST] Erro:', err);
    return NextResponse.json({ error: 'Erro ao registrar tag.' }, { status: 500 });
  }
}
