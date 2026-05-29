import { NextResponse } from 'next/server';
import { connectRedis } from '@/lib/redis';
import clientPromise from '@/lib/mongodb';

// POST /api/cron/consolidate-views
// Consolidado: lê todos os contadores Redis post:*:views e persiste no Supabase.
// Trigger: container Ofelia (mcuadros/ofelia) configurado no docker-compose.yml.
// Proteção: CRON_SECRET no header Authorization (Bearer <token>).

const BATCH_SIZE = 50; // Processa N posts por vez para não sobrecarregar o Supabase

export async function POST(request: Request) {
  // Autenticação via shared secret — nunca exposta ao client
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  let processed = 0;
  let errors = 0;

  try {
    const redis = await connectRedis();

    // 1. Varre todas as chaves de views via scanIterator (não bloqueia o Redis)
    const keys: string[] = [];
    for await (const key of redis.scanIterator({ MATCH: 'post:*:views', COUNT: 100 })) {
      const k = Array.isArray(key) ? key[0] : key;
      keys.push(k as string);
    }

    if (keys.length === 0) {
      return NextResponse.json({ message: 'Nenhuma view pendente para consolidar.', processed: 0 });
    }

    // 2. Lê todos os valores em pipeline
    const pipe = redis.multi();
    keys.forEach((key) => pipe.get(key));
    const values = await pipe.exec();

    // 3. Monta mapa postId → views
    const viewMap: Record<string, number> = {};
    keys.forEach((key, i) => {
      const match = key.match(/^post:(.+):views$/);
      if (match) {
        const count = Number(values[i]);
        if (!isNaN(count) && count > 0) {
          viewMap[match[1]] = count;
        }
      }
    });

    const postIds = Object.keys(viewMap);

    // 4. Verifica se existe uma connection com Supabase service role via env
    // A rota de cron usa service role para bypasear RLS e fazer update em bulk
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // chave de service role (não exposta ao client)
      { auth: { persistSession: false } }
    );

    // 5. Atualiza em lotes para não saturar a conexão
    for (let i = 0; i < postIds.length; i += BATCH_SIZE) {
      const batch = postIds.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (postId) => {
          const { error } = await supabase
            .from('posts')
            .update({ views_count: viewMap[postId] })
            .eq('id', postId);

          if (error) {
            errors++;
            console.warn(`Falha ao atualizar views do post ${postId}:`, error.message);
          } else {
            processed++;
          }
        })
      );
    }

    // 6. Registra execução do job no MongoDB para auditoria
    try {
      const mongo = await clientPromise;
      await mongo.db('literaconnect').collection('cron_logs').insertOne({
        job: 'consolidate-views',
        ran_at: new Date(),
        duration_ms: Date.now() - started,
        keys_found: keys.length,
        processed,
        errors,
      });
    } catch {
      // Log não pode quebrar o job
    }

    return NextResponse.json({
      message: 'Consolidação concluída.',
      keys_found: keys.length,
      processed,
      errors,
      duration_ms: Date.now() - started,
    });
  } catch (err: any) {
    console.error('Cron consolidate-views error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
